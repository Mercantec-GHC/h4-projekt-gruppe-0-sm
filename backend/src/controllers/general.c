#include "../http/http.h"
#include "../models/models_json.h"
#include "controllers.h"
#include <string.h>

void route_get_index(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    RESPOND_HTML(ctx,
        200,
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

void route_get_not_found(HttpCtx* ctx)
{
    if (http_ctx_req_headers_has(ctx, "Accept")) {
        const char* accept = http_ctx_req_headers_get(ctx, "Accept");
        if (strcmp(accept, "application/json") == 0) {
            RESPOND_JSON(ctx,
                404,
                "{\"ok\":false,\"msg\":\"404 Not Found\",\"path\":\"%s\"}",
                http_ctx_req_path(ctx));
            return;
        }
    }
    RESPOND_HTML(ctx,
        404,
        "<!DOCTYPE html><html><head><meta "
        "charset=\"utf-8\"></head><body><center><h1>404 Not "
        "Found</h1><code style=\"font-size: 1rem;\">GET "
        "%s</code></center></body></html>",
        http_ctx_req_path(ctx));
}
