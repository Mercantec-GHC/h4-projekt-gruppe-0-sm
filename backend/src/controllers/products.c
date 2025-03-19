#include "../http/http.h"
#include "../models/models_json.h"
#include "../utils/str.h"
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

    const char* body_str = http_ctx_req_body_str(ctx);
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

    const char* body_str = http_ctx_req_body_str(ctx);
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

void route_post_products_set_image(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* query = http_ctx_req_query(ctx);
    if (!query) {
        RESPOND_BAD_REQUEST(ctx, "no product_id parameter");
        return;
    }
    HttpQueryParams* params = http_parse_query_params(query);
    char* product_id_str = http_query_params_get(params, "product_id");
    http_query_params_free(params);
    if (!product_id_str) {
        RESPOND_BAD_REQUEST(ctx, "no product_id parameter");
        return;
    }

    int64_t product_id = strtol(product_id_str, NULL, 10);
    free(product_id_str);

    const uint8_t* body = http_ctx_req_body(ctx);
    size_t body_size = http_ctx_req_body_size(ctx);

    DbRes db_res = db_product_image_insert(cx->db, product_id, body, body_size);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        return;
    }

    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
}

static inline int read_fallback_image(uint8_t** buffer, size_t* buffer_size)
{
    int res;

    const char* filepath = PUBLIC_DIR_PATH "/product_fallback_256x256.png";

    FILE* fp = fopen(filepath, "r");
    if (!fp) {
        return -1;
    }
    fseek(fp, 0L, SEEK_END);
    size_t file_size = (size_t)ftell(fp);
    rewind(fp);

    const size_t max_file_size = 16777216;
    if (file_size >= max_file_size) {
        fprintf(stderr,
            "error: file too large '%s' >= %ld\n",
            filepath,
            max_file_size);
        res = -1;
        goto l0_return;
    }

    uint8_t* temp_buffer = malloc(file_size);
    size_t bytes_read = fread(temp_buffer, sizeof(char), file_size, fp);
    if (bytes_read != file_size) {
        fprintf(stderr, "error: could not read file '%s'\n", filepath);
        res = -1;
        goto l1_return;
    }

    *buffer = temp_buffer;
    *buffer_size = file_size;
    temp_buffer = NULL;

    res = 0;
l1_return:
    if (temp_buffer)
        free(temp_buffer);
l0_return:
    fclose(fp);
    return res;
}

void route_get_products_image_png(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* query = http_ctx_req_query(ctx);
    if (!query) {
        RESPOND_HTML_BAD_REQUEST(ctx, "no product_id parameter");
        return;
    }
    HttpQueryParams* params = http_parse_query_params(query);
    char* product_id_str = http_query_params_get(params, "product_id");
    http_query_params_free(params);
    if (!product_id_str) {
        RESPOND_HTML_BAD_REQUEST(ctx, "no product_id parameter");
        return;
    }

    int64_t product_id = strtol(product_id_str, NULL, 10);
    free(product_id_str);

    uint8_t* buffer;
    size_t buffer_size;

    DbRes db_res = db_product_image_with_product_id(
        cx->db, &buffer, &buffer_size, product_id);
    if (db_res == DbRes_NotFound) {
        int res = read_fallback_image(&buffer, &buffer_size);
        if (res != 0) {
            RESPOND_HTML_SERVER_ERROR(ctx);
            return;
        }
    } else if (db_res != DbRes_Ok) {
        RESPOND_HTML_SERVER_ERROR(ctx);
        return;
    }

    http_ctx_res_headers_set(ctx, "Content-Type", "image/png");

    http_ctx_respond(ctx, 200, buffer, buffer_size);
}

static inline int read_and_send_file(
    HttpCtx* ctx, const char* filepath, const char* mime_type)
{
    int res;

    FILE* fp = fopen(filepath, "r");
    if (!fp) {
        RESPOND_HTML_SERVER_ERROR(ctx);
        return -1;
    }
    fseek(fp, 0L, SEEK_END);
    size_t file_size = (size_t)ftell(fp);
    rewind(fp);

    const size_t max_file_size = 16777216;
    if (file_size >= max_file_size) {
        fprintf(stderr,
            "error: file too large '%s' >= %ld\n",
            filepath,
            max_file_size);
        RESPOND_HTML_SERVER_ERROR(ctx);
        res = -1;
        goto l0_return;
    }

    char* buf = calloc(file_size + 1, sizeof(char));
    size_t bytes_read = fread(buf, sizeof(char), file_size, fp);
    if (bytes_read != file_size) {
        fprintf(stderr, "error: could not read file '%s'\n", filepath);
        RESPOND_HTML_SERVER_ERROR(ctx);
        res = -1;
        goto l0_return;
    }

    http_ctx_res_headers_set(ctx, "Content-Type", mime_type);

    http_ctx_respond_str(ctx, 200, buf);

    res = 0;
l0_return:
    fclose(fp);
    return res;
}

void route_get_product_editor_html(HttpCtx* ctx)
{
    read_and_send_file(
        ctx, PUBLIC_DIR_PATH "/product_editor.html", "text/html");
}

void route_get_product_editor_js(HttpCtx* ctx)
{
    read_and_send_file(
        ctx, PUBLIC_DIR_PATH "/product_editor.js", "application/javascript");
}
