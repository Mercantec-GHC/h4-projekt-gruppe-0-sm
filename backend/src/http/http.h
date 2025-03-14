#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct HttpServer HttpServer;

typedef struct {
    uint16_t port;
    size_t workers_amount;
} HttpServerOpts;

typedef struct HttpCtx HttpCtx;
typedef void (*HttpHandlerFn)(HttpCtx* ctx);

/// On ok, HttpServer
/// On error, returns NULL and prints.
HttpServer* http_server_new(HttpServerOpts opts);
void http_server_free(HttpServer* server);
/// On ok, returns 0.
/// On error, returns -1 and prints;
int http_server_listen(HttpServer* server);
void http_server_set_user_ctx(HttpServer* server, void* user_ctx);
void http_server_get(
    HttpServer* server, const char* path, HttpHandlerFn handler);
void http_server_post(
    HttpServer* server, const char* path, HttpHandlerFn handler);
void http_server_set_not_found(HttpServer* server, HttpHandlerFn handler);

void* http_ctx_user_ctx(HttpCtx* ctx);
const char* http_ctx_req_path(HttpCtx* ctx);
bool http_ctx_req_headers_has(HttpCtx* ctx, const char* key);
const char* http_ctx_req_headers_get(HttpCtx* ctx, const char* key);
const char* http_ctx_req_query(HttpCtx* ctx);
const char* http_ctx_req_body(HttpCtx* ctx);
void http_ctx_res_headers_set(HttpCtx* ctx, const char* key, const char* value);
void http_ctx_respond(HttpCtx* ctx, int status, const char* body);
