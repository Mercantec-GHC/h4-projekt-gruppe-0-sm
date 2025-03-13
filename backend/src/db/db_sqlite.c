#include "db_sqlite.h"
#include "../models/models.h"
#include "../util/str.h"
#include "db.h"
#include <assert.h>
#include <sqlite3.h>
#include <stdint.h>
#include <stdio.h>

static inline char* get_str_safe(sqlite3_stmt* stmt, int col)
{
    const char* val = (const char*)sqlite3_column_text(stmt, col);
    if (!val)
        return str_dup("NULL");
    return str_dup((const char*)val);
}

#define GET_INT(COL) sqlite3_column_int64(stmt, COL)
#define GET_STR(COL) get_str_safe(stmt, COL)

Db* db_sqlite_new(void)
{
    Db* db = malloc(sizeof(Db));

    sqlite3* connection;
    int res = sqlite3_open("database.db", &connection);
    if (res != SQLITE_OK) {
        fprintf(stderr, "error: could not open sqlite 'database.db'\n");
        return NULL;
    }
    sqlite3_close(connection);

    return db;
}

void db_sqlite_free(Db* db)
{
    // sqlite3_close(db->connection);
    free(db);
}

static inline DbRes connect(sqlite3** connection)
{
    int res = sqlite3_open("database.db", connection);
    if (res != SQLITE_OK) {
        fprintf(stderr,
            "error: could not open sqlite 'database.db'\n    %s\n",
            sqlite3_errmsg(*connection));
        return DbRes_Error;
    }
    return DbRes_Ok;
}

static inline void disconnect(sqlite3* connection)
{
    sqlite3_close(connection);
}

#define CONNECT                                                                \
    {                                                                          \
        if (connect(&connection) != DbRes_Ok) {                                \
            return DbRes_Error;                                                \
        }                                                                      \
    }

#define DISCONNECT                                                             \
    {                                                                          \
        disconnect(connection);                                                \
    }

DbRes db_user_insert(Db* db, const User* user)
{
    static_assert(sizeof(User) == 40, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    sqlite3_prepare_v2(connection,
        "INSERT INTO users (name, email, password_hash, balance_dkk_cent) "
        "VALUES (?, ?, ?, ?)",
        -1,
        &stmt,
        NULL);

    sqlite3_bind_text(stmt, 1, user->name, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, user->email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, user->password_hash, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, user->balance_dkk_cent);

    int step_res = sqlite3_step(stmt);
    if (step_res != SQLITE_DONE) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}

DbRes db_user_with_id(Db* db, User* user, int64_t id)
{
    static_assert(sizeof(User) == 40, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    sqlite3_prepare_v2(connection,
        "SELECT id, name, email, password_hash, balance_dkk_cent"
        " FROM users WHERE id = ?",
        -1,
        &stmt,
        NULL);
    sqlite3_bind_int64(stmt, 1, id);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }
    *user = (User) {
        .id = GET_INT(0),
        .name = GET_STR(1),
        .email = GET_STR(2),
        .password_hash = GET_STR(3),
        .balance_dkk_cent = GET_INT(4),
    };

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}

DbRes db_users_with_email(Db* db, Ids* ids, const char* email)
{
    static_assert(sizeof(User) == 40, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;
    int sqlite_res;

    sqlite3_stmt* stmt;
    sqlite_res = sqlite3_prepare_v2(
        connection, "SELECT id FROM users WHERE email = ?", -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, email, -1, NULL);

    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        int64_t id = GET_INT(0);
        ids_push(ids, id);
    }
    if (sqlite_res != SQLITE_DONE) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}

DbRes db_user_with_email(Db* db, User* user, const char* email)
{
    static_assert(sizeof(User) == 40, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT id, name, email, password_hash, balance_dkk_cent"
        " FROM users WHERE email = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        fprintf(stderr,
            "error: %s\n  at %s:%d\n",
            sqlite3_errmsg(connection),
            __func__,
            __LINE__);
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_text(stmt, 1, email, -1, NULL);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        printf("step_res = %d, email = '%s'\n", step_res, email);
        fprintf(stderr,
            "error: %s\n  at %s:%d\n",
            sqlite3_errmsg(connection),
            __func__,
            __LINE__);
        res = DbRes_Error;
        goto l0_return;
    }
    *user = (User) {
        .id = GET_INT(0),
        .name = GET_STR(1),
        .email = GET_STR(2),
        .password_hash = GET_STR(3),
        .balance_dkk_cent = GET_INT(4),
    };

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}

DbRes db_product_all(Db* db, ProductVec* vec)
{
    static_assert(sizeof(Product) == 48, "model has changed");
    sqlite3* connection;
    CONNECT;
    DbRes res;
    int sqlite_res;

    sqlite3_stmt* stmt;
    sqlite_res = sqlite3_prepare_v2(connection,
        "SELECT id, name, description, price_dkk_cent, coord, barcode FROM "
        "products",
        -1,
        &stmt,
        NULL);
    if (sqlite_res != SQLITE_OK) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        Product product = {
            .id = GET_INT(0),
            .name = GET_STR(1),
            .description = GET_STR(2),
            .price_dkk_cent = GET_INT(3),
            .coord_id = GET_INT(4),
            .barcode = GET_STR(5),
        };
        product_vec_push(vec, product);
    }
    if (sqlite_res != SQLITE_DONE) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}

DbRes db_cart_items_with_user_id(Db* db, CartItemVec* vec, int64_t user_id)
{
    static_assert(sizeof(Cart) == 16, "model has changed");
    static_assert(sizeof(CartItem) == 32, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int sqlite_res = sqlite3_prepare_v2(connection,
        "SELECT id "
        " FROM carts WHERE user = ?",
        -1,
        &stmt,
        NULL);
    if (sqlite_res != SQLITE_OK) {
        fprintf(stderr,
            "error: %s\n  at %s:%d\n",
            sqlite3_errmsg(connection),
            __func__,
            __LINE__);
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, user_id);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }
    int64_t cart_id = GET_INT(0);

    sqlite_res = sqlite3_prepare_v2(connection,
        "SELECT id, cart, product, amount FROM cart_items WHERE cart = ?",
        -1,
        &stmt,
        NULL);
    sqlite3_bind_int64(stmt, 1, cart_id);

    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        CartItem cart_item = {
            .id = GET_INT(0),
            .cart_id = GET_INT(1),
            .product_id = GET_INT(2),
            .amount = GET_INT(3),
        };
        cart_item_vec_push(vec, cart_item);
    }
    if (sqlite_res != SQLITE_DONE) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}
