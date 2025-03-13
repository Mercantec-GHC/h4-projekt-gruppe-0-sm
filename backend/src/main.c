#include "controllers.h"
#include "db_sqlite.h"
#include "http/http.h"
#include "json.h"
#include "models.h"
#include "models_json.h"
#include "str_util.h"
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

    Cx cx = {
        .number = 1,
        .db = db,
    };
    session_vec_construct(&cx.sessions);

    server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .workers_amount = 8,
    });
    if (!server) {
        return -1;
    }

    http_server_set_user_ctx(server, &cx);

    http_server_get(server, "/api/products/all", route_get_products_all);

    http_server_get(server, "/api/cart", route_get_cart_items_from_session);

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
    db_sqlite_free(db);
}

void test(void)
{
    str_util_test();
    printf("ALL TESTS PASSED 💅\n");
    exit(0);
}
