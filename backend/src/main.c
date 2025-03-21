#include "collections/kv_map.h"
#include "controllers/controllers.h"
#include "db/db_sqlite.h"
#include "http/http.h"
#include "models/models_json.h"
#include <sqlite3.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef struct {
    bool run_tests;
} Args;

static inline Args parse_args(int argc, char** argv);
static inline void run_tests(void);

HttpServer* server;

int main(int argc, char** argv)
{
    srand((unsigned int)time(NULL));

    Args args = parse_args(argc, argv);

    if (args.run_tests) {
        run_tests();
    }

    Db* db = db_sqlite_new();

    Cx cx;
    cx_construct(&cx, db);

    server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .workers_amount = 8,
    });
    if (!server) {
        return -1;
    }

    http_server_set_user_ctx(server, &cx);

    http_server_get(server, "/api/products/all", route_get_products_all);
    http_server_post(
        server, "/api/products/create", route_post_products_create);
    http_server_post(
        server, "/api/products/update", route_post_products_update);
    http_server_get(server, "/api/products/coords", route_get_products_coords);
    http_server_post(
        server, "/api/products/set_coords", route_post_products_set_coords);
    http_server_post(
        server, "/api/products/set-image", route_post_products_set_image);
    http_server_get(
        server, "/api/products/image.png", route_get_products_image_png);

    http_server_get(
        server, "/product_editor/index.html", route_get_product_editor_html);
    http_server_get(server,
        "/product_editor/product_editor.js",
        route_get_product_editor_js);

    http_server_post(server, "/api/carts/purchase", route_post_carts_purchase);

    http_server_get(server, "/api/receipts/one", route_get_receipts_one);
    http_server_get(server, "/api/receipts/all", route_get_receipts_all);

    http_server_post(server, "/api/users/register", route_post_users_register);
    http_server_post(
        server, "/api/users/balance/add", route_post_users_balance_add);

    http_server_post(server, "/api/sessions/login", route_post_sessions_login);
    http_server_post(
        server, "/api/sessions/logout", route_post_sessions_logout);
    http_server_get(server, "/api/sessions/user", route_get_sessions_user);

    http_server_get(server, "/", route_get_index);
    http_server_post(server, "/set_number", route_post_set_number);

    http_server_set_not_found(server, route_get_not_found);

    printf("listening at http://127.0.0.1:8080/\n");
    http_server_listen(server);

    http_server_free(server);
    cx_destroy(&cx);
    db_sqlite_free(db);
}

static inline Args parse_args(int argc, char** argv)
{
    Args args = {
        .run_tests = false,
    };
    for (int i = 1; i < argc; ++i) {
        if (strcmp(argv[i], "--run-tests") == 0) {
            args.run_tests = true;
        }
    }
    return args;
}

static inline void run_tests(void)
{
#ifdef INCLUDE_TESTS
    test_util_str();
    test_collections_kv_map();
    printf("\n\x1b[1;97m ALL TESTS \x1b[1;92mPASSED"
           " \x1b[1;97mSUCCESSFULLY 💅\x1b[0m\n\n");
    exit(0);
#else
    fprintf(stderr,
        "warning: tests not build."
        " '--run-tests' passed without building with INCLUDE_TESTS=1\n");
#endif
}
