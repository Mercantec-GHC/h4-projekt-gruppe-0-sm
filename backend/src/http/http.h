#pragma once

#include "../util/str.h"
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
const char* http_ctx_req_body_str(HttpCtx* ctx);
const uint8_t* http_ctx_req_body(HttpCtx* ctx);
size_t http_ctx_req_body_size(HttpCtx* ctx);
void http_ctx_res_headers_set(HttpCtx* ctx, const char* key, const char* value);
void http_ctx_respond_str(HttpCtx* ctx, int status, const char* body);
void http_ctx_respond(
    HttpCtx* ctx, int status, const uint8_t* body, size_t body_size);

typedef struct HttpQueryParams HttpQueryParams;

HttpQueryParams* http_parse_query_params(const char* query);
void http_query_params_free(HttpQueryParams* query_params);
char* http_query_params_get(
    const HttpQueryParams* query_params, const char* key);
