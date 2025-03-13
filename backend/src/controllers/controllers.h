#pragma once

#include "../db/db.h"
#include "../http/http.h"
#include <stdio.h>
#include <string.h>

typedef struct {
    int64_t user_id;
    char* token;
    size_t token_hash;
} Session;

void session_construct(Session* session, int64_t user_id);
void session_destroy(Session* session);

DEFINE_VEC(Session, SessionVec, session_vec, 16)

void sessions_remove(SessionVec* vec, int64_t user_id);
Session* sessions_add(SessionVec* vec, int64_t user_id);
const Session* sessions_find(SessionVec* vec, const char* token);

typedef struct {
    int number;
    SessionVec sessions;
    Db* db;
} Cx;

void route_get_index(HttpCtx* ctx);
void route_post_set_number(HttpCtx* ctx);
void route_get_not_found(HttpCtx* ctx);

void route_get_products_all(HttpCtx* ctx);

void route_get_cart_items_from_session(HttpCtx* ctx);

void route_post_users_register(HttpCtx* ctx);

void route_post_sessions_login(HttpCtx* ctx);
void route_post_sessions_logout(HttpCtx* ctx);
void route_get_sessions_user(HttpCtx* ctx);

const Session* header_session(HttpCtx* ctx);
const Session* middleware_session(HttpCtx* ctx);

#define RESPOND(HTTP_CTX, STATUS, MIME_TYPE, ...)                              \
    {                                                                          \
        HttpCtx* _ctx = (HTTP_CTX);                                            \
        char _body[512];                                                       \
        snprintf(_body, 512 - 1, __VA_ARGS__);                                 \
                                                                               \
        char content_length[24] = { 0 };                                       \
        snprintf(content_length, 24 - 1, "%ld", strlen(_body));                \
                                                                               \
        http_ctx_res_headers_set(_ctx, "Content-Type", MIME_TYPE);             \
        http_ctx_res_headers_set(_ctx, "Content-Length", content_length);      \
                                                                               \
        http_ctx_respond(_ctx, (STATUS), _body);                               \
    }

#define RESPOND_HTML(HTTP_CTX, STATUS, ...)                                    \
    RESPOND(HTTP_CTX, STATUS, "text/html", __VA_ARGS__)
#define RESPOND_JSON(HTTP_CTX, STATUS, ...)                                    \
    RESPOND(HTTP_CTX, STATUS, "application/json; charset=utf-8", __VA_ARGS__)

#define RESPOND_BAD_REQUEST(HTTP_CTX, MSG)                                     \
    RESPOND_JSON(HTTP_CTX, 400, "{\"ok\":false,\"msg\":\"%s\"}", (MSG))
#define RESPOND_SERVER_ERROR(HTTP_CTX)                                         \
    RESPOND_JSON(HTTP_CTX, 500, "{\"ok\":false,\"msg\":\"server error\"}")

__attribute__((unused)) static inline void ___include_user(void)
{
    RESPOND((HttpCtx*)0, 200, "text/html", "")
}
