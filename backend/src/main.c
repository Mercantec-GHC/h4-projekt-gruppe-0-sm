#include "collections/kv_map.h"
#include "controllers/controllers.h"
#include "db/db_sqlite.h"
#include "http/http.h"
#include "models/models_json.h"
#include "util/str.h"
#include <sqlite3.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void test(void);

HttpServer* server;

int main(void)
{
    srand((unsigned int)time(NULL));

#ifdef RUN_TESTS
    test();
#endif

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

    http_server_post(server, "/api/carts/purchase", route_post_carts_purchase);

    http_server_get(server, "/api/receipts/one", route_get_receipt);

    http_server_post(server, "/api/users/register", route_post_users_register);
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

#ifdef RUN_TESTS
void test(void)
{
    test_util_str();
    test_collections_kv_map();
    printf("\n\x1b[1;97m ALL TESTS \x1b[1;92mPASSED"
           " \x1b[1;97mSUCCESSFULLY 💅\x1b[0m\n\n");
    exit(0);
}
#endif
