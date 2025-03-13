#include "client.h"
#include "../str_util.h"
#include "packet.h"
#include <ctype.h>
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static inline int parse_request_header(Client* client, Request* request);
static inline int recieve_request_body(Client* client, Request* request);
static inline int next_line(Client* client, StrSlice* slice);
static inline int next_char(Client* client, char* ch);
static inline int next_u8(Client* client, uint8_t* ch);

Client* http_client_new(ClientConnection connection)
{
    Client* client = malloc(sizeof(Client) + CLIENT_BUFFER_SIZE);
    *client = (Client) {
        .connection = connection,
        .buffer_i = 0,
        .buffer_size = 0,
    };
    return client;
}

void http_client_free(Client* client)
{
    free(client);
}

int http_client_next(Client* client, Request* request)
{
    if (parse_request_header(client, request) != 0)
        return -1;

    if (request->method == Method_POST) {
        if (!http_request_has_header(request, "Content-Length")) {
            fprintf(stderr,
                "error: POST request has no body and/or Content-Length "
                "header\n");
            return -1;
        }
        if (recieve_request_body(client, request) != 0)
            return -1;
    }
    return 0;
}

static inline int recieve_request_body(Client* client, Request* request)
{
    const char* length_val = http_request_get_header(request, "Content-Length");
    size_t length = strtoul(length_val, NULL, 10);

    uint8_t* body = calloc(length + 1, sizeof(uint8_t));
    for (size_t i = 0; i < length; ++i) {
        uint8_t ch;
        if (next_u8(client, &ch) != 0)
            return -1;
        body[i] = ch;
    }

    request->body = body;
    request->body_size = length;

    return 0;
}

static inline int parse_request_header(Client* client, Request* request)
{

    StrSlice req_line;
    if (next_line(client, &req_line) != 0)
        return -1;
    StrSplitter req_line_splitter
        = str_splitter(req_line.ptr, req_line.len, " ");
    StrSlice method_str = str_split_next(&req_line_splitter);
    StrSlice uri_str = str_split_next(&req_line_splitter);
    StrSlice version_str = str_split_next(&req_line_splitter);

    if (strncmp(version_str.ptr, "HTTP/1.1", 8) != 0) {
        fprintf(stderr,
            "error: unrecognized http version '%.*s'\n",
            (int)version_str.len,
            version_str.ptr);
        return -1;
    }

    if (method_str.len >= 8) {
        fprintf(stderr, "error: malformed http method\n");
        return -1;
    }
    char normalized_method[8] = "";
    for (size_t i = 0; i < method_str.len; ++i) {
        normalized_method[i] = (char)toupper(method_str.ptr[i]);
    }

    struct MethodStrMapEntry {
        const char* key;
        Method val;
    };
    const struct MethodStrMapEntry method_str_map[] = {
        { "GET", Method_GET },
        { "POST", Method_POST },
    };
    const size_t method_str_map_size
        = sizeof(method_str_map) / sizeof(method_str_map[0]);

    Method method;
    bool method_found = false;
    for (size_t i = 0; i < method_str_map_size; ++i) {
        if (strncmp(normalized_method, method_str_map[i].key, method_str.len)
            == 0) {
            method = method_str_map[i].val;
            method_found = true;
            break;
        }
    }
    if (!method_found) {
        fprintf(stderr,
            "error: unrecognized http method '%.*s'\n",
            (int)method_str.len,
            method_str.ptr);
        return -1;
    }

    if (uri_str.len >= MAX_PATH_LEN + 1) {
        fprintf(stderr, "error: path too long\n");
        return -1;
    }

    size_t path_len = 0;
    while (path_len < uri_str.len && uri_str.ptr[path_len] != '?'
        && uri_str.ptr[path_len] != '#') {
        path_len += 1;
    }

    char* path = calloc(path_len + 1, sizeof(char));
    strncpy(path, uri_str.ptr, path_len);
    path[path_len] = '\0';

    char* query = NULL;
    if (path_len < uri_str.len) {
        size_t query_len = 0;
        while (path_len + query_len < uri_str.len
            && uri_str.ptr[path_len + query_len] != '#') {
            query_len += 1;
        }
        query = calloc(query_len + 1, sizeof(char));
        strncpy(query, &uri_str.ptr[path_len], query_len);
        query[query_len] = '\0';
    }

    HeaderVec headers;
    header_vec_construct(&headers);

    while (headers.size < MAX_HEADERS_LEN) {
        StrSlice line;
        if (next_line(client, &line) != 0)
            return -1;
        if (line.len == 0) {
            break;
        }

        size_t key_len = 0;
        while (key_len < line.len && line.ptr[key_len] != ':') {
            key_len += 1;
        }
        if (key_len == 0 || key_len > MAX_HEADER_KEY_LEN) {
            fprintf(stderr, "error: header key too long\n");
            return -1;
        }
        size_t value_begin = key_len + 1;
        while (value_begin < line.len && line.ptr[value_begin] == ' ') {
            value_begin += 1;
        }
        size_t value_len = line.len - value_begin;
        if (value_len == 0 || value_len > MAX_HEADER_VALUE_LEN) {
            fprintf(stderr, "error: header value too long, %ld\n", value_len);
            return -1;
        }

        char* key = calloc(key_len + 1, sizeof(char));
        strncpy(key, line.ptr, key_len);

        char* value = calloc(value_len + 1, sizeof(char));
        strncpy(value, &line.ptr[value_begin], value_len);

        header_vec_push(&headers, (Header) { key, value });
    }

    *request = (Request) {
        method,
        path,
        query,
        headers,
        .body = NULL,
        .body_size = 0,
    };
    return 0;
}

static inline int next_line(Client* client, StrSlice* slice)
{
    size_t begin = client->buffer_i;
    size_t len = 0;
    char last = '\0';
    char ch;
    if (next_char(client, &ch) != 0)
        return -1;
    len += 1;
    while (!(last == '\r' && ch == '\n')) {
        last = ch;
        if (next_char(client, &ch) != 0)
            return -1;
        len += 1;
    }
    *slice = (StrSlice) {
        .ptr = (const char*)&client->buffer[begin],
        .len = len - 2,
    };
    return 0;
}

static inline int next_char(Client* client, char* ch)
{
    return next_u8(client, (uint8_t*)ch);
}

static inline int next_u8(Client* client, uint8_t* ch)
{
    if (client->buffer_i >= client->buffer_size) {
        ssize_t bytes_received = recv(
            client->connection.file, client->buffer, CLIENT_BUFFER_SIZE, 0);
        if (bytes_received == -1) {
            fprintf(stderr,
                "error: could not receive from client: %s\n",
                strerror(errno));
            return -1;
        }
        client->buffer_i = 0;
        client->buffer_size = (size_t)bytes_received;
    }
    *ch = client->buffer[client->buffer_i++];
    return 0;
}
