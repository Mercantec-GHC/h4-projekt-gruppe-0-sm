#pragma once

#include "db.h"
#include <stdio.h>
#include <string.h>

typedef struct {
    int number;
    Db* db;
} Cx;

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
    RESPOND(HTTP_CTX, STATUS, "application/json", __VA_ARGS__)
