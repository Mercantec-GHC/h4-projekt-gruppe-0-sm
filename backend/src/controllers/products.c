#include "../http/http.h"
#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"
#include <stdio.h>

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

void route_post_products_create(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* body_str = http_ctx_req_body(ctx);
    JsonValue* body_json = json_parse(body_str, strlen(body_str));
    if (!body_json) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        return;
    }

    ProductsCreateReq req;
    int parse_result = products_create_req_from_json(&req, body_json);
    json_free(body_json);
    if (parse_result != 0) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        return;
    }

    Product product = {
        .id = 0,
        .name = str_dup(req.name),
        .price_dkk_cent = req.price_dkk_cent,
        .description = str_dup(req.description),
        .coord_id = req.coord_id,
        .barcode = str_dup(req.barcode),
    };
    products_create_req_destroy(&req);

    DbRes db_res = db_product_insert(cx->db, &product);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    RESPOND_JSON(ctx, 200, "{\"ok\":true}");

l0_return:
    product_destroy(&product);
}

void route_post_products_update(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* body_str = http_ctx_req_body(ctx);
    printf("body_str = '%s'\n", body_str);

    JsonValue* body_json = json_parse(body_str, strlen(body_str));
    printf("body_json = %p\n", (void*)body_json);

    if (!body_json) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        return;
    }

    Product product;
    int parse_result = product_from_json(&product, body_json);
    printf("parse_result = %d\n", parse_result);
    json_free(body_json);
    if (parse_result != 0) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        return;
    }

    DbRes db_res = db_product_update(cx->db, &product);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    RESPOND_JSON(ctx, 200, "{\"ok\":true}");

l0_return:
    product_destroy(&product);
}

static inline int read_and_send_file(HttpCtx* ctx,
    const char* filepath,
    size_t max_file_size,
    const char* mime_type)
{
    int res;

    FILE* fp = fopen(filepath, "r");
    if (!fp) {
        RESPOND_HTML_SERVER_ERROR(ctx);
        return -1;
    }

    char* buf = calloc(max_file_size + 1, sizeof(char));
    size_t bytes_read = fread(buf, sizeof(char), max_file_size, fp);
    if (bytes_read == 0) {
        RESPOND_HTML_SERVER_ERROR(ctx);
        res = -1;
        goto l0_return;
    } else if (bytes_read >= max_file_size) {
        fprintf(stderr,
            "error: file too large '%s' >= %ld\n",
            filepath,
            max_file_size);
        RESPOND_HTML_SERVER_ERROR(ctx);
        res = -1;
        goto l0_return;
    }

    char content_length[24] = { 0 };
    snprintf(content_length, 24 - 1, "%ld", bytes_read);

    http_ctx_res_headers_set(ctx, "Content-Type", mime_type);
    http_ctx_res_headers_set(ctx, "Content-Length", content_length);

    http_ctx_respond(ctx, 200, buf);

    res = 0;
l0_return:
    fclose(fp);
    return res;
}

void route_get_product_editor_html(HttpCtx* ctx)
{
    read_and_send_file(
        ctx, PUBLIC_DIR_PATH "/product_editor.html", 16384 - 1, "text/html");
}

void route_get_product_editor_js(HttpCtx* ctx)
{
    read_and_send_file(ctx,
        PUBLIC_DIR_PATH "/product_editor.js",
        16384 - 1,
        "application/javascript");
}
