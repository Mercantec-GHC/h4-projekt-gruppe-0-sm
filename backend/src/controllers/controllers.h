#pragma once

#include "../db/db.h"
#include "../http/http.h"
#include <pthread.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    int64_t user_id;
    char* token;
    size_t token_hash;
} Session;

void session_construct(Session* session, int64_t user_id);
void session_destroy(Session* session);

DEFINE_VEC(Session, SessionVec, session_vec)

typedef struct {
    pthread_mutex_t mutex;
    int number;
    SessionVec sessions;
    Db* db;
} Cx;

void cx_construct(Cx* cx, Db* db);
void cx_destroy(Cx* cx);

void cx_sessions_remove(Cx* cx, int64_t user_id);
Session* cx_sessions_add(Cx* cx, int64_t user_id);
const Session* cx_sessions_find(Cx* cx, const char* token);

void route_get_index(HttpCtx* ctx);
void route_post_set_number(HttpCtx* ctx);
void route_get_not_found(HttpCtx* ctx);

void route_get_products_all(HttpCtx* ctx);

void route_post_carts_purchase(HttpCtx* ctx);

void route_post_users_register(HttpCtx* ctx);
void route_post_users_balance_add(HttpCtx* ctx);

void route_post_sessions_login(HttpCtx* ctx);
void route_post_sessions_logout(HttpCtx* ctx);
void route_get_sessions_user(HttpCtx* ctx);

void route_get_receipts_one(HttpCtx* ctx);
void route_get_receipts_all(HttpCtx* ctx);

const Session* header_session(HttpCtx* ctx);
const Session* middleware_session(HttpCtx* ctx);

#define RESPOND(HTTP_CTX, STATUS, MIME_TYPE, ...)                              \
    {                                                                          \
        HttpCtx* _ctx = (HTTP_CTX);                                            \
        size_t _body_size = (size_t)snprintf(NULL, 0, __VA_ARGS__);            \
        char* _body = calloc(_body_size + 1, sizeof(char));                    \
        sprintf(_body, __VA_ARGS__);                                           \
                                                                               \
        char content_length[24] = { 0 };                                       \
        snprintf(content_length, 24 - 1, "%ld", strlen(_body));                \
                                                                               \
        http_ctx_res_headers_set(_ctx, "Content-Type", MIME_TYPE);             \
        http_ctx_res_headers_set(_ctx, "Content-Length", content_length);      \
                                                                               \
        http_ctx_respond(_ctx, (STATUS), _body);                               \
        free(_body);                                                           \
    }

#define RESPOND_HTML(HTTP_CTX, STATUS, ...)                                    \
    RESPOND(HTTP_CTX, STATUS, "text/html", __VA_ARGS__)
#define RESPOND_JSON(HTTP_CTX, STATUS, ...)                                    \
    RESPOND(HTTP_CTX, STATUS, "application/json; charset=utf-8", __VA_ARGS__)

#define RESPOND_BAD_REQUEST(HTTP_CTX, MSG)                                     \
    RESPOND_JSON(HTTP_CTX, 400, "{\"ok\":false,\"msg\":\"%s\"}", (MSG))
#define RESPOND_SERVER_ERROR(HTTP_CTX)                                         \
    RESPOND_JSON(HTTP_CTX, 500, "{\"ok\":false,\"msg\":\"server error\"}")

__attribute__((unused)) static inline void ___controllers_include_user(void)
{
    RESPOND((HttpCtx*)0, 200, "text/html", "")
}
