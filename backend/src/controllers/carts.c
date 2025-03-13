#include "../controllers.h"
#include "../http_server.h"
#include "../models_json.h"
#include "../str_util.h"

void route_get_cart_items_from_session(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;


    CartItemVec cart_items;
    cart_item_vec_construct(&cart_items);

    DbRes db_res = db_cart_items_with_user_id(cx->db, &cart_items, session->user_id);
    if (db_res != DbRes_Ok) {
        RESPOND_BAD_REQUEST(ctx, "Could not find cart for user");
        return;
    }


    String res;
    string_construct(&res);

    string_push_str(&res, "{\"ok\":true,\"products\":[");
    for (size_t i = 0; i < cart_items.size; ++i) {
        if (i != 0) {
            string_push_str(&res, ",");
        }
        char* json = cart_item_to_json_string(&cart_items.data[i]);
        string_push_str(&res, json);
        free(json);
    }
    string_push_str(&res, "]}");


    cart_item_vec_destroy(&cart_items);
    RESPOND_JSON(ctx, 200, "%s", res.data);
    string_destroy(&res);
}
