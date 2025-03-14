#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"
#include <stdio.h>

void route_post_carts_purchase(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    const char* body_str = http_ctx_req_body(ctx);
    JsonValue* body_json = json_parse(body_str, strlen(body_str));
    if (!body_json) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        return;
    }

    CartsPurchaseReq req;
    int parse_result = carts_purchase_req_from_json(&req, body_json);
    json_free(body_json);
    if (parse_result != 0) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        return;
    }

    printf("product_id\tamount\n");
    for (size_t i = 0; i < req.items.size; ++i) {
        printf("%ld\t\t%ld\n",
            req.items.data[i].product_id,
            req.items.data[i].amount);
    }

    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
}
