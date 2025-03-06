#include "controllers.h"
#include "db_sqlite.h"
#include "http_server.h"
#include "json.h"
#include "models.h"
#include "models_json.h"
#include "str_util.h"
#include <sqlite3.h>
#include <stdio.h>
#include <string.h>

void route_get_index(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    RESPOND_HTML(ctx, 200,
        "<!DOCTYPE html><html><head><meta "
        "charset=\"utf-8\"></head><body><h1>Number = %d</h1></body></html>",
        cx->number);
}

void route_post_set_number(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* body_text = http_ctx_req_body(ctx);
    JsonParser parser;
    json_parser_construct(&parser, body_text, strlen(body_text));
    JsonValue* body = json_parser_parse(&parser);
    json_parser_destroy(&parser);

    if (!json_object_has(body, "value")) {
        RESPOND_JSON(
            ctx, 200, "{\"ok\": false, \"msg\": \"no 'value' key\"}\r\n");
        goto l0_return;
    }

    int64_t value = json_int(json_object_get(body, "value"));
    cx->number = (int)value;

    RESPOND_JSON(ctx, 200, "{\"ok\": true}\r\n");

l0_return:
    json_free(body);
}

HttpServer* server;

int main(void)
{
    Db* db = db_sqlite_new();

    Cx cx = {
        .number = 1,
        .db = db,
    };

    server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .workers_amount = 8,
    });
    if (!server) {
        return -1;
    }

    http_server_set_user_ctx(server, &cx);

    http_server_get(server, "/products/all", route_get_products_all);

    http_server_get(server, "/", route_get_index);
    http_server_post(server, "/set_number", route_post_set_number);

    printf("listening at http://127.0.0.1:8080/\n");
    http_server_listen(server);

    http_server_free(server);
    db_sqlite_free(db);
}
