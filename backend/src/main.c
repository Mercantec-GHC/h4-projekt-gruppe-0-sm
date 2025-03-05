#include "http_server.h"
#include "json.h"
#include "models.h"
#include "models_json.h"
#include "str_util.h"
#include <sqlite3.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    int number;
} Cx;

#define RESPOND(HTTP_CTX, STATUS, MIME_TYPE, ...)                              \
    {                                                                          \
        HttpCtx* _ctx = (HTTP_CTX);                                            \
        char _body[512];                                                       \
        snprintf(_body, 512 - 1, __VA_ARGS__);                                 \
                                                                               \
        char content_length[24] = { 0 };                                       \
        snprintf(content_length, 24 - 1, "%ld", strlen(_body));                \
                                                                               \
        http_ctx_res_headers_set(_ctx, "Content-Type", MIME_TYPE);             \
        http_ctx_res_headers_set(_ctx, "Content-Length", content_length);      \
                                                                               \
        http_ctx_respond(_ctx, (STATUS), _body);                               \
    }

#define RESPOND_HTML(HTTP_CTX, STATUS, ...)                                    \
    RESPOND(HTTP_CTX, STATUS, "text/html", __VA_ARGS__)
#define RESPOND_JSON(HTTP_CTX, STATUS, ...)                                    \
    RESPOND(HTTP_CTX, STATUS, "application/json", __VA_ARGS__)

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

static inline void insert_test_user(sqlite3* db)
{
    sqlite3_stmt* stmt;
    sqlite3_prepare_v2(db,
        "INSERT INTO users (email, password_hash, balance_dkk_cent) "
        "VALUES (?, ?, ?)",
        -1, &stmt, NULL);

    char email[] = "testuser@email.com";
    char password[] = "1234";
    StrHash password_hash = str_hash(password);
    char* password_hash_str = str_hash_to_string(password_hash);

    sqlite3_bind_text(stmt, 1, email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, password_hash_str, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 3, 123);

    int res = sqlite3_step(stmt);
    if (res != SQLITE_DONE) {
        fprintf(stderr, "error: could not insert test user: %s\n",
            sqlite3_errmsg(db));
    }

    sqlite3_finalize(stmt);
}

HttpServer* server;

int main(void)
{

    User user = {
        .id = 12,
        .email = str_dup("test@mail.dk"),
        .password_hash = str_dup("hawd"),
        .balance_dkk_cent = 321,
    };

    char* str = user_to_json_string(&user);
    printf("user = '%s'\n", str);

    User user2;

    JsonValue* json = json_parse(str, strlen(str));

    user_from_json(&user2, json);

    char* str2 = user_to_json_string(&user2);
    printf("user2 = '%s'\n", str2);

    user_free(&user);
    user_free(&user2);

    json_free(json);
    free(str);
    free(str2);

    return 0;

    sqlite3* db;
    int res = sqlite3_open("database.db", &db);
    if (res != SQLITE_OK) {
        fprintf(stderr, "error: could not open sqlite 'database.db'\n");
        return -1;
    }

    insert_test_user(db);

    Cx cx = { .number = 1 };

    server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .workers_amount = 8,
    });
    if (!server) {
        return -1;
    }

    http_server_set_user_ctx(server, &cx);
    http_server_get(server, "/", route_get_index);
    http_server_post(server, "/set_number", route_post_set_number);

    printf("listening at http://127.0.0.1:8080/\n");
    http_server_listen(server);

    http_server_free(server);
    sqlite3_close(db);
}
