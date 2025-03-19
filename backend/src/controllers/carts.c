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

    size_t item_amount = req.items.size;

    // accumulate product_prices and total

    int64_t total_dkk_cent = 0;

    ProductPriceVec prices;
    product_price_vec_construct(&prices);

    for (size_t i = 0; i < item_amount; ++i) {
        ProductPrice price;
        DbRes db_res = db_product_price_of_product(
            cx->db, &price, req.items.data[i].product_id);
        if (db_res != DbRes_Ok) {
            RESPOND_SERVER_ERROR(ctx);
            goto l0_return;
        }
        total_dkk_cent += price.price_dkk_cent * req.items.data[i].amount;
        product_price_vec_push(&prices, price);
    }

    // check and update user balance

    User user;
    DbRes db_res = db_user_with_id(cx->db, &user, session->user_id);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    if (user.balance_dkk_cent < total_dkk_cent) {
        RESPOND_JSON(ctx, 200, "{\"ok\":false,\"msg\":\"insufficient funds\"}");
        goto l0_return;
    }
    user.balance_dkk_cent -= total_dkk_cent;

    db_res = db_user_update(cx->db, &user);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    // assemble receipt

    Receipt receipt = {
        .id = 0,
        .user_id = session->user_id,
        .timestamp = NULL,
        .total_dkk_cent = total_dkk_cent,
        .products = (ReceiptProductVec) { 0 },
    };
    receipt_product_vec_construct(&receipt.products);

    for (size_t i = 0; i < item_amount; ++i) {
        receipt_product_vec_push(&receipt.products,
            (ReceiptProduct) {
                .id = 0,
                .receipt_id = 0,
                .product_price_id = prices.data[i].id,
                .amount = req.items.data[i].amount,
            });
    }

    // insert receipt

    int64_t receipt_id;
    db_res = db_receipt_insert(cx->db, &receipt, &receipt_id);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    RESPOND_JSON(ctx, 200, "{\"ok\":true,\"receipt_id\":%ld}", receipt_id);

l0_return:
    receipt_destroy(&receipt);
    product_price_vec_destroy(&prices);
    user_destroy(&user);
    carts_purchase_req_destroy(&req);
}
