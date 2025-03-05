#include "http_server.h"
#include <stdio.h>
#include <string.h>

typedef struct {
    int number;
} Cx;

void route_get_index(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    char body[512];
    snprintf(body, 512 - 1,
        "<!DOCTYPE html><html><head><meta "
        "charset=\"utf-8\"></head><body><h1>Number = %d</h1></body></html>",
        cx->number);

    char content_length[24] = { 0 };
    snprintf(content_length, 24 - 1, "%ld", strlen(body));

    http_ctx_res_headers_set(ctx, "Content-Type", "text/html");
    http_ctx_res_headers_set(ctx, "Content-Length", content_length);

    http_ctx_respond(ctx, 200, body);
}

void route_post_set_number(HttpCtx* ctx)
{
    printf("set number\n");
}

HttpServer* server;

int main(void)
{
    Cx cx = { .number = 1 };

    server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .workers_amount = 8,
    });
    if (!server) {
        return -1;
    }

    http_server_set_user_ctx(server, &cx);
    http_server_get(server, "/", route_get_index);
    http_server_post(server, "/set_number", route_post_set_number);

    printf("listening at http://127.0.0.1:8080/\n");
    http_server_listen(server);

    http_server_free(server);
}
