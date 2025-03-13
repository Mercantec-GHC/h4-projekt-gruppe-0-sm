#include "server.h"
#include "../http.h"
#include "../str_util.h"
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

HttpServer* http_server_new(HttpServerOpts opts)
{

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd == -1) {
        fprintf(stderr, "error: could not initialize socket\n");
        return NULL;
    }

    SockAddrIn server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(opts.port);

    int reuse = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    int res = bind(server_fd, (SockAddr*)&server_addr, sizeof(server_addr));
    if (res != 0) {
        fprintf(stderr, "error: could not bind socket\n");
        return NULL;
    }

    res = listen(server_fd, 16);
    if (res != 0) {
        fprintf(stderr, "error: could not listen on socket\n");
        return NULL;
    }

    HttpServer* server = malloc(sizeof(HttpServer));
    *server = (HttpServer) {
        .file = server_fd,
        .addr = server_addr,
        // .ctx = {},
        .workers = malloc(sizeof(Worker) * opts.workers_amount),
        .workers_size = opts.workers_amount,
        .handlers = { 0 },
        .not_found_handler = NULL,
        .user_ctx = NULL,
    };

    worker_ctx_construct(&server->ctx, server);
    for (size_t i = 0; i < opts.workers_amount; ++i) {
        worker_construct(&server->workers[i], &server->ctx);
    }
    handler_vec_construct(&server->handlers);

    return server;
}

void http_server_free(HttpServer* server)
{
    close(server->file);
    for (size_t i = 0; i < server->workers_size; ++i) {
        worker_destroy(&server->workers[i]);
    }
    worker_ctx_destroy(&server->ctx);
    handler_vec_destroy(&server->handlers);
    free(server);
}

int http_server_listen(HttpServer* server)
{
    WorkerCtx* ctx = &server->ctx;

    while (true) {
        SockAddrIn client_addr;
        socklen_t addr_size = sizeof(client_addr);

        int res = accept(server->file, (SockAddr*)&client_addr, &addr_size);
        if (res == -1) {
            fprintf(stderr, "error: could not accept\n");
            return -1;
        }

        Client req = { .file = res, client_addr };
        pthread_mutex_lock(&ctx->mutex);

        res = client_queue_push(&ctx->req_queue, req);
        if (res != 0) {
            fprintf(stderr, "error: request queue full\n");
            return -1;
        }
        pthread_mutex_unlock(&ctx->mutex);
        pthread_cond_signal(&ctx->cond);
    }
}

void http_server_set_user_ctx(HttpServer* server, void* user_ctx)
{
    server->user_ctx = user_ctx;
}

void http_server_get(
    HttpServer* server, const char* path, HttpHandlerFn handler)
{
    handler_vec_push(
        &server->handlers, (Handler) { path, .method = Method_GET, handler });
}

void http_server_post(
    HttpServer* server, const char* path, HttpHandlerFn handler)
{
    handler_vec_push(
        &server->handlers, (Handler) { path, .method = Method_POST, handler });
}

void http_server_set_not_found(HttpServer* server, HttpHandlerFn handler)
{
    server->not_found_handler = handler;
}

void* http_ctx_user_ctx(HttpCtx* ctx)
{
    return ctx->user_ctx;
}

const char* http_ctx_req_path(HttpCtx* ctx)
{
    return ctx->req->path;
}

bool http_ctx_req_headers_has(HttpCtx* ctx, const char* key)
{
    return request_has_header(ctx->req, key);
}

const char* http_ctx_req_headers_get(HttpCtx* ctx, const char* key)
{
    return request_get_header(ctx->req, key);
}

const char* http_ctx_req_body(HttpCtx* ctx)
{
    return ctx->req_body;
}

void http_ctx_res_headers_set(HttpCtx* ctx, const char* key, const char* value)
{
    char* key_copy = malloc(strlen(key) + 1);
    strcpy(key_copy, key);
    char* value_copy = malloc(strlen(value) + 1);
    strcpy(value_copy, value);

    header_vec_push(&ctx->res_headers, (Header) { key_copy, value_copy });
}

void http_ctx_respond(HttpCtx* ctx, int status, const char* body)
{
    // https://httpwg.org/specs/rfc9112.html#persistent.tear-down
    http_ctx_res_headers_set(ctx, "Connection", "close");

    String res;
    string_construct(&res);

    char first_line[32];
    snprintf(
        first_line,
        32 - 1,
        "HTTP/1.1 %d %s\r\n",
        status,
        http_response_code_string(status));
    string_push_str(&res, first_line);

    for (size_t i = 0; i < ctx->res_headers.size; ++i) {
        Header* header = &ctx->res_headers.data[i];
        char line[96];
        snprintf(line, 96 - 1, "%s: %s\r\n", header->key, header->value);
        string_push_str(&res, line);
    }
    string_push_str(&res, "\r\n");

    string_push_str(&res, body);

    ssize_t bytes_written = write(ctx->client->file, res.data, res.size);
    if (bytes_written != (ssize_t)res.size) {
        fprintf(stderr, "error: could not send response\n");
    }

    string_destroy(&res);
}

//
//
//

static inline void
worker_ctx_construct(WorkerCtx* ctx, const HttpServer* server)
{
    ctx->server = server;
    pthread_mutex_init(&ctx->mutex, NULL);
    pthread_cond_init(&ctx->cond, NULL);
    client_queue_construct(&ctx->req_queue, 8192);
}

static inline void worker_ctx_destroy(WorkerCtx* ctx)
{
    pthread_mutex_destroy(&ctx->mutex);
    pthread_cond_destroy(&ctx->cond);
    client_queue_destroy(&ctx->req_queue);
}

static inline int worker_construct(Worker* worker, WorkerCtx* ctx)
{
    *worker = (Worker) {
        // .thread = {},
        .ctx = ctx,
    };

    pthread_create(&worker->thread, NULL, worker_thread_fn, worker);
    return 0;
}

static inline void worker_destroy(Worker* worker)
{
    if (worker->thread != 0) {
        pthread_cancel(worker->thread);

        // a bit ugly, but who cares?
        pthread_cond_broadcast(&worker->ctx->cond);

        pthread_join(worker->thread, NULL);
    }
}

static inline void* worker_thread_fn(void* data)
{
    Worker* worker = data;
    worker_listen(worker);
    return NULL;
}

static inline void worker_listen(Worker* worker)
{
    WorkerCtx* ctx = worker->ctx;
    while (true) {
        pthread_testcancel();

        pthread_mutex_lock(&ctx->mutex);

        if (client_queue_size(&ctx->req_queue) > 0) {
            Client req;
            client_queue_pop(&ctx->req_queue, &req);
            pthread_mutex_unlock(&ctx->mutex);

            worker_handle_request(worker, &req);
            continue;
        }

        pthread_cond_wait(&ctx->cond, &ctx->mutex);

        pthread_mutex_unlock(&ctx->mutex);
    }
}

static inline void worker_handle_request(Worker* worker, Client* client)
{
    (void)worker;

    uint8_t* buffer = calloc(MAX_HEADER_BUFFER_SIZE, sizeof(char));
    ssize_t bytes_received
        = recv(client->file, buffer, MAX_HEADER_BUFFER_SIZE * sizeof(char), 0);

    if (bytes_received == -1) {
        fprintf(stderr, "error: could not receive request\n");
        goto l0_return;
    }

    size_t header_end = 0;
    for (ssize_t i = 0; i < bytes_received - 3; ++i) {
        if (memcmp((char*)&buffer[i], "\r\n\r\n", 4)) {
            header_end = (size_t)i + 5;
        }
    }
    if (header_end == 0) {
        fprintf(
            stderr,
            "error: header too big, exceeded %d bytes\n",
            MAX_HEADER_BUFFER_SIZE);
        goto l0_return;
    }

    Request req;
    size_t body_idx;
    int res = parse_request_header(&req, &body_idx, (char*)buffer, header_end);
    if (res != 0) {
        fprintf(stderr, "error: failed to parse header\n");
        goto l0_return;
    }

    char* body = NULL;
    if (req.method == Method_POST) {
        if (!request_has_header(&req, "Content-Length")) {
            fprintf(
                stderr,
                "error: POST request has no body and/or Content-Length "
                "header\n");
            goto l1_return;
        }
        const char* length_val = request_get_header(&req, "Content-Length");
        size_t length = strtoul(length_val, NULL, 10);
        body = calloc(length + 1, sizeof(char));
        strncpy(body, (char*)&buffer[body_idx], length);
        body[length] = '\0';

        // HACK
        // TODO: We should treat the input as a stream rather than a block.
        // Look at either @camper0008's stream example or other HTTP-server
        // implementations.
        size_t defacto_length = strlen(body);
        int attempts = 0;
        const int arbitrary_max_attempts = 10;
        while (defacto_length < length && attempts < arbitrary_max_attempts) {
            attempts += 1;

            uint8_t buffer[8192];
            ssize_t recieved = recv(client->file, buffer, 8192, 0);

            if (recieved == -1) {
                fprintf(stderr, "error: could not receive request body\n");
                goto l1_return;
            }

            strncpy(&body[defacto_length], (char*)buffer, (size_t)recieved);
            defacto_length += (size_t)recieved;
            body[defacto_length] = '\0';
        }
        if (defacto_length < length) {
            fprintf(stderr, "error: could not receive entire request body\n");
            goto l1_return;
        }
    }

    HttpCtx handler_ctx = {
        .client = client,
        .req = &req,
        .req_body = body,
        .res_headers = { 0 },
        .user_ctx = worker->ctx->server->user_ctx,
    };

    header_vec_construct(&handler_ctx.res_headers);

    bool been_handled = false;

    for (size_t i = 0; i < worker->ctx->server->handlers.size; ++i) {
        Handler* handler = &worker->ctx->server->handlers.data[i];
        if (handler->method != req.method)
            continue;
        if (strcmp(handler->path, req.path) != 0)
            continue;
        handler->handler(&handler_ctx);
        been_handled = true;
        break;
    }

    if (!been_handled && worker->ctx->server->not_found_handler != NULL) {
        worker->ctx->server->not_found_handler(&handler_ctx);
    }

l1_return:
    header_vec_destroy(&handler_ctx.res_headers);
    request_destroy(&req);
    if (body)
        free(body);
l0_return:
    free(buffer);
    close(client->file);
}

static inline int parse_request_header(
    Request* req, size_t* body_idx, const char* const buf, size_t buf_size)
{
    StrSplitter splitter = str_split(buf, buf_size, "\r\n");

    StrSlice req_line = strsplit_next(&splitter);
    StrSplitter req_line_splitter = str_split(req_line.ptr, req_line.len, " ");
    StrSlice method_str = strsplit_next(&req_line_splitter);
    StrSlice uri_str = strsplit_next(&req_line_splitter);
    StrSlice version_str = strsplit_next(&req_line_splitter);

    if (strncmp(version_str.ptr, "HTTP/1.1", 8) != 0) {
        fprintf(
            stderr,
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
        fprintf(
            stderr,
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
        StrSlice line = strsplit_next(&splitter);
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

    *req = (Request) { method, path, query, headers };
    return 0;
}

static inline void request_destroy(Request* req)
{
    free(req->path);
    for (size_t i = 0; i < req->headers.size; ++i) {
        free(req->headers.data[i].key);
        free(req->headers.data[i].value);
    }
    header_vec_destroy(&req->headers);
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

static inline bool request_has_header(const Request* req, const char* key)
{
    for (size_t i = 0; i < req->headers.size; ++i) {
        if (strcmp_lower(key, req->headers.data[i].key) == 0) {
            return true;
        }
    }
    return false;
}

static inline const char*
request_get_header(const Request* req, const char* key)
{
    for (size_t i = 0; i < req->headers.size; ++i) {
        if (strcmp_lower(key, req->headers.data[i].key) == 0) {
            return req->headers.data[i].value;
        }
    }
    return NULL;
}
