#include "../http/http.h"
#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"

void route_get_products_all(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    ProductVec products;
    product_vec_construct(&products);

    DbRes db_res = db_product_all(cx->db, &products);
    if (db_res != DbRes_Ok) {
        RESPOND_JSON(ctx, 500, "{\"ok\":false,\"msg\":\"db error\"}");
        return;
    }

    String res;
    string_construct(&res);

    string_push_str(&res, "{\"ok\":true,\"products\":[");
    for (size_t i = 0; i < products.size; ++i) {
        if (i != 0) {
            string_push_str(&res, ",");
        }
        char* json = product_to_json_string(&products.data[i]);
        string_push_str(&res, json);
        free(json);
    }
    string_push_str(&res, "]}");

    product_vec_destroy(&products);
    RESPOND_JSON(ctx, 200, "%s", res.data);
    string_destroy(&res);
}
