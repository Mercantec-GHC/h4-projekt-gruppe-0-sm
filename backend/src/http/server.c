#include "server.h"
#include "../utils/str.h"
#include "http.h"
#include <errno.h>
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

    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd == -1) {
        fprintf(stderr,
            "error: could not initialize socket: %s\n",
            strerror(errno));
        return NULL;
    }

    SockAddrIn addr;
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(opts.port);

    int reuse = 1;
    int res = setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
    if (res != 0) {
        fprintf(stderr,
            "error: could not set socket options: %s\n",
            strerror(errno));
        return NULL;
    }

    res = bind(fd, (SockAddr*)&addr, sizeof(addr));
    if (res != 0) {
        fprintf(stderr, "error: could not bind socket: %s\n", strerror(errno));
        return NULL;
    }

    res = listen(fd, 16);
    if (res != 0) {
        fprintf(
            stderr, "error: could not listen on socket: %s\n", strerror(errno));
        return NULL;
    }

    HttpServer* server = malloc(sizeof(HttpServer));
    *server = (HttpServer) {
        .fd = fd,
        .addr = addr,
        .ctx = (WorkerCtx) { 0 },
        .workers = malloc(sizeof(Worker) * opts.workers_amount),
        .workers_size = opts.workers_amount,
        .handlers = { 0 },
        .not_found_handler = NULL,
        .user_ctx = NULL,
    };

    http_worker_ctx_construct(&server->ctx, server);
    for (size_t i = 0; i < opts.workers_amount; ++i) {
        http_worker_construct(&server->workers[i], &server->ctx);
    }
    handler_vec_construct(&server->handlers);

    return server;
}

void http_server_free(HttpServer* server)
{
    close(server->fd);
    for (size_t i = 0; i < server->workers_size; ++i) {
        http_worker_destroy(&server->workers[i]);
    }
    http_worker_ctx_destroy(&server->ctx);
    handler_vec_destroy(&server->handlers);
    free(server);
}

int http_server_listen(HttpServer* server)
{
    WorkerCtx* ctx = &server->ctx;

    while (true) {
        SockAddrIn client_addr;
        socklen_t addr_size = sizeof(client_addr);

        int res = accept(server->fd, (SockAddr*)&client_addr, &addr_size);
        if (res == -1) {
            fprintf(stderr, "error: could not accept\n");
            return -1;
        }

        ClientConnection req = { .file = res, client_addr };
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
    return http_request_has_header(ctx->req, key);
}

const char* http_ctx_req_headers_get(HttpCtx* ctx, const char* key)
{
    return http_request_get_header(ctx->req, key);
}

const char* http_ctx_req_query(HttpCtx* ctx)
{
    return ctx->req->query;
}

const char* http_ctx_req_body_str(HttpCtx* ctx)
{
    return (char*)ctx->req_body;
}

const uint8_t* http_ctx_req_body(HttpCtx* ctx)
{
    return ctx->req_body;
}

size_t http_ctx_req_body_size(HttpCtx* ctx)
{
    return ctx->req_body_size;
}

void http_ctx_res_headers_set(HttpCtx* ctx, const char* key, const char* value)
{
    char* key_copy = malloc(strlen(key) + 1);
    strcpy(key_copy, key);
    char* value_copy = malloc(strlen(value) + 1);
    strcpy(value_copy, value);

    header_vec_push(&ctx->res_headers, (Header) { key_copy, value_copy });
}

void http_ctx_respond_str(HttpCtx* ctx, int status, const char* body)
{
    http_ctx_respond(ctx, status, (const uint8_t*)body, strlen(body));
}

void http_ctx_respond(
    HttpCtx* ctx, int status, const uint8_t* body, size_t body_size)
{
    // https://httpwg.org/specs/rfc9112.html#persistent.tear-down
    http_ctx_res_headers_set(ctx, "Connection", "close");

    char content_length[24] = { 0 };
    snprintf(content_length, 24 - 1, "%ld", body_size);
    http_ctx_res_headers_set(ctx, "Content-Length", content_length);

    String res;
    string_construct(&res);

    char first_line[32];
    snprintf(first_line,
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

    ssize_t bytes_written = write(ctx->client->file, res.data, res.size);
    if (bytes_written != (ssize_t)res.size) {
        fprintf(stderr, "error: could not send response header\n");
    }
    string_destroy(&res);

    bytes_written = write(ctx->client->file, body, body_size);
    if (bytes_written != (ssize_t)body_size) {
        fprintf(stderr, "error: could not send response body\n");
    }
}
