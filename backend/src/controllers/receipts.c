#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"
#include <stdlib.h>
#include <string.h>

void route_get_receipts_one(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    const char* query = http_ctx_req_query(ctx);
    HttpQueryParams* params = http_parse_query_params(query);
    char* receipt_id_str = http_query_params_get(params, "receipt_id");
    http_query_params_free(params);
    if (!receipt_id_str) {
        RESPOND_BAD_REQUEST(ctx, "no receipt_id parameter");
        return;
    }

    int64_t receipt_id = strtol(receipt_id_str, NULL, 10);
    free(receipt_id_str);

    Receipt receipt;
    DbRes db_res = db_receipt_with_id_and_user_id(
        cx->db, &receipt, receipt_id, session->user_id);
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
        .timestamp = str_dup(receipt.timestamp),
        .products = (ReceiptsOneResProductVec) { 0 },
    };
    receipts_one_res_product_vec_construct(&res.products);
    for (size_t i = 0; i < receipt.products.size; ++i) {
        receipts_one_res_product_vec_push(&res.products,
            (ReceiptsOneResProduct) {
                .product_id = products.data[i].id,
                .name = str_dup(products.data[i].name),
                .price_dkk_cent = product_prices.data[i].price_dkk_cent,
                .amount = receipt.products.data[i].amount,
            });
    }

    char* res_json = receipts_one_res_to_json_string(&res);

    RESPOND_JSON(ctx, 200, "{\"ok\":true,\"receipt\":%s}", res_json);

    free(res_json);
    receipts_one_res_destroy(&res);
    for (size_t i = 0; i < products.size; ++i)
        product_destroy(&products.data[i]);
    product_vec_destroy(&products);
    for (size_t i = 0; i < products.size; ++i)
        product_price_destroy(&product_prices.data[i]);
    product_price_vec_destroy(&product_prices);
    receipt_destroy(&receipt);
}

void route_get_receipts_all(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    ReceiptHeaderVec receipts;
    receipt_header_vec_construct(&receipts);
    DbRes db_res = db_receipt_all_headers_with_user_id(
        cx->db, &receipts, session->user_id);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        return;
    }

    String receipts_str;
    string_construct(&receipts_str);
    for (size_t i = 0; i < receipts.size; ++i) {
        if (i != 0) {
            string_pushf(&receipts_str, ",");
        }
        char* receipt_json = receipt_header_to_json_string(&receipts.data[i]);
        string_push_str(&receipts_str, receipt_json);
        free(receipt_json);
    }

    RESPOND_JSON(
        ctx, 200, "{\"ok\":true,\"receipts\":[%s]}", receipts_str.data);
    string_destroy(&receipts_str);
    for (size_t i = 0; i < receipts.size; ++i)
        receipt_header_destroy(&receipts.data[i]);
    receipt_header_vec_destroy(&receipts);
}
