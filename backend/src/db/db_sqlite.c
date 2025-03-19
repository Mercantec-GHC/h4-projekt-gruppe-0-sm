#include "db_sqlite.h"
#include "../models/models.h"
#include "../utils/str.h"
#include "db.h"
#include <assert.h>
#include <sqlite3.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define REPORT_SQLITE3_ERROR()                                                 \
    fprintf(stderr,                                                            \
        "error: %s\n  at %s:%d\n",                                             \
        sqlite3_errmsg(connection),                                            \
        __func__,                                                              \
        __LINE__)

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
    int res = sqlite3_open_v2("database.db",
        connection,
        SQLITE_OPEN_READWRITE | SQLITE_OPEN_NOMUTEX,
        NULL);
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
    int prepare_res = sqlite3_prepare_v2(connection,
        "INSERT INTO users (name, email, password_hash, balance_dkk_cent) "
        "VALUES (?, ?, ?, ?)",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_text(stmt, 1, user->name, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, user->email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, user->password_hash, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, user->balance_dkk_cent);

    int step_res = sqlite3_step(stmt);
    if (step_res != SQLITE_DONE) {
        REPORT_SQLITE3_ERROR();
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

DbRes db_user_update(Db* db, const User* user)
{
    static_assert(sizeof(User) == 40, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "UPDATE users SET name = ?, email = ?, password_hash= ?, "
        "balance_dkk_cent= ? WHERE id = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_text(stmt, 1, user->name, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, user->email, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, user->password_hash, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, user->balance_dkk_cent);
    sqlite3_bind_int64(stmt, 5, user->id);

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
    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT id, name, email, password_hash, balance_dkk_cent"
        " FROM users WHERE id = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
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

DbRes db_user_with_email_exists(Db* db, bool* exists, const char* email)
{
    sqlite3* connection;
    CONNECT;
    DbRes res;
    int sqlite_res;

    sqlite3_stmt* stmt;
    sqlite_res = sqlite3_prepare_v2(
        connection, "SELECT id FROM users WHERE email = ?", -1, &stmt, NULL);
    sqlite3_bind_text(stmt, 1, email, -1, NULL);

    *exists = false;
    if ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        *exists = true;
    }
    if (sqlite_res != SQLITE_DONE) {
        REPORT_SQLITE3_ERROR();
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
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_text(stmt, 1, email, -1, NULL);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        REPORT_SQLITE3_ERROR();
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

DbRes db_product_insert(Db* db, const Product* product)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "INSERT INTO products"
        " (name, price_dkk_cent, description, coord, barcode)"
        " VALUES (?, ?, ?, ?, ?)",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_text(stmt, 1, product->name, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 2, product->price_dkk_cent);
    sqlite3_bind_text(stmt, 3, product->description, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, product->coord_id);
    sqlite3_bind_text(stmt, 5, product->barcode, -1, SQLITE_STATIC);

    int step_res = sqlite3_step(stmt);
    if (step_res != SQLITE_DONE) {
        REPORT_SQLITE3_ERROR();
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

DbRes db_product_update(Db* db, const Product* product)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "UPDATE products SET"
        "  name = ?,"
        "  price_dkk_cent = ?,"
        "  description = ?,"
        "  coord = ?,"
        "  barcode = ?"
        " WHERE id = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_text(stmt, 1, product->name, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 2, product->price_dkk_cent);
    sqlite3_bind_text(stmt, 3, product->description, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 4, product->coord_id);
    sqlite3_bind_text(stmt, 5, product->barcode, -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 6, product->id);

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

DbRes db_product_with_id(Db* db, Product* product, int64_t id)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT id, name, price_dkk_cent, description, coord, barcode FROM "
        "products WHERE id = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, id);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    *product = (Product){
        .id = GET_INT(0),
        .name = GET_STR(1),
        .price_dkk_cent = GET_INT(2),
        .description = GET_STR(3),
        .coord_id = GET_INT(4),
        .barcode = GET_STR(5),
    },

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

static inline DbRes get_product_price_from_product_id(
    sqlite3* connection, int64_t product_id, int64_t* price)
{
    DbRes res;
    sqlite3_stmt* stmt = NULL;
    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT price_dkk_cent FROM products WHERE id = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, product_id);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    *price = GET_INT(0);

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    return res;
}

static inline DbRes insert_product_price(sqlite3* connection,
    ProductPrice* product_price,
    int64_t product_id,
    int64_t price)
{
    DbRes res;
    sqlite3_stmt* stmt = NULL;
    int prepare_res = sqlite3_prepare_v2(connection,
        "INSERT INTO product_prices (product, price_dkk_cent) "
        "VALUES (?, ?)",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_int64(stmt, 1, product_id);
    sqlite3_bind_int64(stmt, 2, price);

    int step_res = sqlite3_step(stmt);
    if (step_res != SQLITE_DONE) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    int64_t id = sqlite3_last_insert_rowid(connection);
    *product_price = (ProductPrice) {
        .id = id,
        .product_id = product_id,
        .price_dkk_cent = price,
    };

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    return res;
}

DbRes db_product_price_of_product(
    Db* db, ProductPrice* product_price, int64_t product_id)
{
    static_assert(sizeof(ProductPrice) == 24, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt = NULL;
    int prepare_res;

    int64_t current_price;
    res = get_product_price_from_product_id(
        connection, product_id, &current_price);
    if (res != DbRes_Ok) {
        goto l0_return;
    }

    prepare_res = sqlite3_prepare_v2(connection,
        "SELECT id FROM product_prices"
        " WHERE product = ? AND price_dkk_cent = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, product_id);
    sqlite3_bind_int64(stmt, 2, current_price);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_ROW) {
        *product_price = (ProductPrice) {
            .id = GET_INT(0),
            .product_id = product_id,
            .price_dkk_cent = current_price,
        };
    } else if (step_res == SQLITE_DONE) {
        insert_product_price(
            connection, product_price, product_id, current_price);
    } else {
        REPORT_SQLITE3_ERROR();
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

DbRes db_receipt_insert(Db* db, const Receipt* receipt, int64_t* id)
{
    static_assert(sizeof(Receipt) == 56, "model has changed");
    static_assert(sizeof(ReceiptProduct) == 32, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "INSERT INTO receipts (user, total_dkk_cent, timestamp) "
        "VALUES (?, ?, unixepoch('now'))",
        -1,
        &stmt,
        NULL);

    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_int64(stmt, 1, receipt->user_id);
    sqlite3_bind_int64(stmt, 2, receipt->total_dkk_cent);

    int step_res = sqlite3_step(stmt);
    if (step_res != SQLITE_DONE) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    int64_t receipt_id = sqlite3_last_insert_rowid(connection);

    if (id) {
        *id = receipt_id;
    }

    for (size_t i = 0; i < receipt->products.size; ++i) {
        sqlite3_finalize(stmt);
        prepare_res = sqlite3_prepare_v2(connection,
            "INSERT INTO receipt_products (receipt, product_price, amount) "
            "VALUES (?, ?, ?)",
            -1,
            &stmt,
            NULL);

        if (prepare_res != SQLITE_OK) {
            REPORT_SQLITE3_ERROR();
            res = DbRes_Error;
            goto l0_return;
        }

        sqlite3_bind_int64(stmt, 1, receipt_id);
        sqlite3_bind_int64(stmt, 2, receipt->products.data[i].product_price_id);
        sqlite3_bind_int64(stmt, 3, receipt->products.data[i].amount);

        int step_res = sqlite3_step(stmt);
        if (step_res != SQLITE_DONE) {
            REPORT_SQLITE3_ERROR();
            res = DbRes_Error;
            goto l0_return;
        }
    }

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}

DbRes db_receipt_with_id_and_user_id(
    Db* db, Receipt* receipt, int64_t id, int64_t user_id)
{
    static_assert(sizeof(Receipt) == 56, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;
    sqlite3_stmt* stmt = NULL;

    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT id, user, total_dkk_cent, datetime(timestamp, 'unixepoch') "
        "FROM "
        "receipts"
        " WHERE id = ? AND user = ?",
        -1,
        &stmt,
        NULL);

    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_int64(stmt, 1, id);
    sqlite3_bind_int64(stmt, 2, user_id);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    *receipt = (Receipt) {
        .id = GET_INT(0),
        .user_id = GET_INT(1),
        .total_dkk_cent = GET_INT(2),
        .timestamp = GET_STR(3),
        .products = (ReceiptProductVec) { 0 },
    };

    receipt_product_vec_construct(&receipt->products);

    sqlite3_finalize(stmt);
    prepare_res = sqlite3_prepare_v2(connection,
        "SELECT id, receipt, product_price, amount FROM receipt_products"
        " WHERE receipt = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, receipt->id);

    int sqlite_res;
    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        ReceiptProduct product = {
            .id = GET_INT(0),
            .receipt_id = GET_INT(1),
            .product_price_id = GET_INT(2),
            .amount = GET_INT(3),
        };
        receipt_product_vec_push(&receipt->products, product);
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

DbRes db_receipt_all_headers_with_user_id(
    Db* db, ReceiptHeaderVec* receipts, int64_t user_id)
{
    static_assert(sizeof(Receipt) == 56, "model has changed");
    static_assert(sizeof(ReceiptHeader) == 32, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;
    int sqlite_res;

    sqlite3_stmt* stmt;
    sqlite_res = sqlite3_prepare_v2(connection,
        "SELECT id, user, total_dkk_cent, datetime(timestamp, 'unixepoch')"
        " FROM"
        " receipts WHERE"
        " user = ?",
        -1,
        &stmt,
        NULL);
    if (sqlite_res != SQLITE_OK) {
        fprintf(stderr, "error: %s\n", sqlite3_errmsg(connection));
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_int64(stmt, 1, user_id);

    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        ReceiptHeader receipt = {
            .id = GET_INT(0),
            .user_id = GET_INT(1),
            .total_dkk_cent = GET_INT(2),
            .timestamp = GET_STR(3),
        };
        receipt_header_vec_push(receipts, receipt);
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

DbRes db_receipt_prices(
    Db* db, ProductPriceVec* product_prices, int64_t receipt_id)
{
    static_assert(sizeof(ProductPrice) == 24, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;
    sqlite3_stmt* stmt = NULL;

    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT product_prices.id, product_prices.product,"
        " product_prices.price_dkk_cent"
        " FROM receipt_products JOIN product_prices"
        " ON product_prices.id = product_price"
        " AND receipt_products.receipt = ?",
        -1,
        &stmt,
        NULL);

    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, receipt_id);

    int sqlite_res;
    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        ProductPrice product_price = {
            .id = GET_INT(0),
            .product_id = GET_INT(1),
            .price_dkk_cent = GET_INT(2),
        };
        product_price_vec_push(product_prices, product_price);
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

DbRes db_receipt_products(Db* db, ProductVec* products, int64_t receipt_id)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    sqlite3* connection;
    CONNECT;
    DbRes res;
    sqlite3_stmt* stmt = NULL;

    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT"
        "  products.id,"
        "  products.name,"
        "  products.price_dkk_cent,"
        "  products.description,"
        "  products.coord,"
        "  products.barcode"
        " FROM receipt_products"
        " JOIN product_prices"
        "  ON receipt_products.product_price = product_prices.id"
        " JOIN products"
        "  ON product_prices.product = products.id"
        " WHERE receipt_products.receipt = ?",
        -1,
        &stmt,
        NULL);

    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, receipt_id);

    int sqlite_res;
    while ((sqlite_res = sqlite3_step(stmt)) == SQLITE_ROW) {
        Product product = {
            .id = GET_INT(0),
            .name = GET_STR(1),
            .price_dkk_cent = GET_INT(2),
            .description = GET_STR(3),
            .coord_id = GET_INT(4),
            .barcode = GET_STR(5),
        };
        product_vec_push(products, product);
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

DbRes db_product_image_insert(
    Db* db, int64_t product_id, const uint8_t* data, size_t data_size)
{
    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "INSERT INTO product_images (product, data) "
        "VALUES (?, ?)",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    sqlite3_bind_int64(stmt, 1, product_id);
    sqlite3_bind_blob64(stmt, 2, data, data_size, NULL);

    int step_res = sqlite3_step(stmt);
    if (step_res != SQLITE_DONE) {
        REPORT_SQLITE3_ERROR();
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

DbRes db_product_image_with_product_id(
    Db* db, uint8_t** data, size_t* data_size, int64_t product_id)
{

    sqlite3* connection;
    CONNECT;
    DbRes res;

    sqlite3_stmt* stmt;
    int prepare_res = sqlite3_prepare_v2(connection,
        "SELECT data"
        " FROM product_images WHERE product = ?",
        -1,
        &stmt,
        NULL);
    if (prepare_res != SQLITE_OK) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }
    sqlite3_bind_int64(stmt, 1, product_id);

    int step_res = sqlite3_step(stmt);
    if (step_res == SQLITE_DONE) {
        res = DbRes_NotFound;
        goto l0_return;
    } else if (step_res != SQLITE_ROW) {
        REPORT_SQLITE3_ERROR();
        res = DbRes_Error;
        goto l0_return;
    }

    *data_size = (size_t)sqlite3_column_bytes(stmt, 0);
    *data = malloc(*data_size);
    const void* db_data = sqlite3_column_blob(stmt, 0);
    memcpy(*data, db_data, *data_size);

    res = DbRes_Ok;
l0_return:
    if (stmt)
        sqlite3_finalize(stmt);
    DISCONNECT;
    return res;
}
