#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"
#include <stdlib.h>
#include <string.h>

typedef struct {
    StrSlice key;
    StrSlice value;
} QueryParamEntry;

DEFINE_VEC(QueryParamEntry, QueryParamVec, query_param_vec)

typedef struct {
    QueryParamVec vec;
} QueryParams;

QueryParams parse_query_params(const char* query)
{
    QueryParams result = {
        .vec = (QueryParamVec) { 0 },
    };
    query_param_vec_construct(&result.vec);

    StrSplitter params = str_splitter(query, strlen(query), "&");
    StrSlice param;
    while ((param = str_split_next(&params)).len != 0) {
        StrSplitter left_right = str_splitter(param.ptr, param.len, "=");
        StrSlice key = str_split_next(&left_right);
        StrSlice value = str_split_next(&left_right);

        query_param_vec_push(&result.vec, (QueryParamEntry) { key, value });
    }

    return result;
}

void query_params_destroy(QueryParams* query_params)
{
    query_param_vec_destroy(&query_params->vec);
}

char* query_params_get(const QueryParams* query_params, const char* key)
{
    size_t key_len = strlen(key);
    for (size_t i = 0; i < query_params->vec.size; ++i) {
        const QueryParamEntry* entry = &query_params->vec.data[i];
        if (key_len == entry->key.len && strcmp(key, entry->key.ptr)) {
            return str_slice_copy(&entry->value);
        }
    }
    return NULL;
}

void route_get_receipts_one(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    const char* query = http_ctx_req_query(ctx);
    QueryParams params = parse_query_params(query);
    char* receipt_id_str = query_params_get(&params, "receipt_id");
    query_params_destroy(&params);
    if (!receipt_id_str) {
        RESPOND_BAD_REQUEST(ctx, "no receipt_id parameter");
        return;
    }

    int64_t receipt_id = strtol(receipt_id_str, NULL, 10);
    free(receipt_id_str);

    Receipt receipt;
    DbRes db_res = db_receipt_with_id(cx->db, &receipt, receipt_id);
    if (db_res != DbRes_Ok) {
        RESPOND_BAD_REQUEST(ctx, "receipt not found");
        return;
    }

    ProductPriceVec product_prices = { 0 };
    product_price_vec_construct(&product_prices);
    db_res = db_receipt_prices(cx->db, &product_prices, receipt_id);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        return;
    }

    ProductVec products = { 0 };
    product_vec_construct(&products);
    db_res = db_receipt_products(cx->db, &products, receipt_id);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        return;
    }

    ReceiptsOneRes res = {
        .receipt_id = receipt.id,
        .timestamp = receipt.timestamp,
        .products = (ReceiptsOneResProductVec) { 0 },
    };
    receipts_one_res_product_vec_construct(&res.products);
    for (size_t i = 0; i < receipt.products.size; ++i) {
        receipts_one_res_product_vec_push(&res.products,
            (ReceiptsOneResProduct) {
                .product_id = products.data[i].id,
                .name = products.data[i].name,
                .price_dkk_cent = product_prices.data[i].price_dkk_cent,
            });
    }

    char* res_json = receipts_one_res_to_json_string(&res);

    RESPOND_JSON(ctx, 200, "{\"ok\":true,\"receipt\":%s}", res_json);
    free(res_json);
    receipts_one_res_destroy(&res);
    product_vec_destroy(&products);
    product_price_vec_destroy(&product_prices);
    receipt_destroy(&receipt);
}
