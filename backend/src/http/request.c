#include "request.h"
#include "../str_util.h"
#include "packet.h"
#include <ctype.h>
#include <netinet/in.h>
#include <pthread.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <threads.h>
#include <unistd.h>

int http_request_parse(
    Request* req, size_t* body_idx, const char* const buf, size_t buf_size)
{
    StrSplitter splitter = str_splitter(buf, buf_size, "\r\n");

    StrSlice req_line = str_split_next(&splitter);
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

    Method method;
    if (strncmp(normalized_method, "GET", method_str.len) == 0) {
        method = Method_GET;
    } else if (strncmp(normalized_method, "POST", method_str.len) == 0) {
        method = Method_POST;
    } else {
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
        StrSlice line = str_split_next(&splitter);
        if (line.len == 0) {
            *body_idx = (size_t)&line.ptr[2] - (size_t)buf;
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

    *req = (Request) {
        method,
        path,
        query,
        headers,
        .body = NULL,
        .body_size = 0,
    };
    return 0;
}

void http_request_destroy(Request* req)
{
    free(req->path);
    for (size_t i = 0; i < req->headers.size; ++i) {
        free(req->headers.data[i].key);
        free(req->headers.data[i].value);
    }
    header_vec_destroy(&req->headers);
    if (req->body)
        free(req->body);
}

static inline int strcmp_lower(const char* a, const char* b)
{
    size_t i = 0;
    for (; a[i] != '\0' && b[i] != '\0'; ++i) {
        if (tolower(a[i]) != tolower(b[i])) {
            return 1;
        }
    }
    if (a[i] != b[i]) {
        return 1;
    }
    return 0;
}

bool http_request_has_header(const Request* req, const char* key)
{
    for (size_t i = 0; i < req->headers.size; ++i) {
        if (strcmp_lower(key, req->headers.data[i].key) == 0) {
            return true;
        }
    }
    return false;
}

const char* http_request_get_header(const Request* req, const char* key)
{
    for (size_t i = 0; i < req->headers.size; ++i) {
        if (strcmp_lower(key, req->headers.data[i].key) == 0) {
            return req->headers.data[i].value;
        }
    }
    return NULL;
}
