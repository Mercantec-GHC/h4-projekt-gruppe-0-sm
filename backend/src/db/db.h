#pragma once

#include "../collections/collection.h"
#include "../models/models.h"
#include <stdbool.h>
#include <stdint.h>

DEFINE_VEC(int64_t, Ids, ids)
DEFINE_VEC(Product, ProductVec, product_vec)

typedef enum {
    DbRes_Ok,
    DbRes_NotFound,
    DbRes_Error,
} DbRes;

typedef struct Db Db;

/// `user.id` field is ignored.
DbRes db_user_insert(Db* db, const User* user);

/// Uses `user.id` to find model.
DbRes db_user_update(Db* db, const User* user);

/// `user` field is an out parameter.
DbRes db_user_with_id(Db* db, User* user, int64_t id);

DbRes db_user_with_email_exists(Db* db, bool* exists, const char* email);

/// `user` is an out parameter.
DbRes db_user_with_email(Db* db, User* user, const char* email);

/// Expects `vec` to be constructed.
DbRes db_product_all(Db* db, ProductVec* vec);

/// `product_price` is an out parameter.
DbRes db_product_price_of_product(
    Db* db, ProductPrice* product_price, int64_t product_id);

/// `receipt.id`, `receipt.timestamp` and `receipt.products[i].id`
/// are ignored.
/// `id` is an out parameter.
DbRes db_receipt_insert(Db* db, const Receipt* receipt, int64_t* id);

/// `receipt` field is an out parameter.
DbRes db_receipt_with_id(Db* db, Receipt* receipt, int64_t id);

/// `product_prices` field is an out parameter.
/// Expects `product_prices` to be constructed.
DbRes db_receipt_prices(
    Db* db, ProductPriceVec* product_prices, int64_t receipt_id);
