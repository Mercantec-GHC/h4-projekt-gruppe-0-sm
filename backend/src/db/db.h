#pragma once

#include "../collections/vec.h"
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

/// `product.id` are ignored.
DbRes db_product_insert(Db* db, const Product* product);

/// Uses `user.id` to find model.
DbRes db_product_update(Db* db, const Product* product);

/// `product` is an out parameter.
DbRes db_product_with_id(Db* db, Product* product, int64_t id);

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
DbRes db_receipt_with_id_and_user_id(
    Db* db, Receipt* receipt, int64_t id, int64_t user_id);

/// Expects `receipts` to be constructed.
DbRes db_receipt_all_headers_with_user_id(
    Db* db, ReceiptHeaderVec* receipts, int64_t user_id);

/// `product_prices` field is an out parameter.
/// Expects `product_prices` to be constructed.
DbRes db_receipt_prices(
    Db* db, ProductPriceVec* product_prices, int64_t receipt_id);

/// `products` field is an out parameter.
/// Expects `products` to be constructed.
DbRes db_receipt_products(Db* db, ProductVec* products, int64_t receipt_id);

DbRes db_product_image_insert(
    Db* db, int64_t product_id, const uint8_t* data, size_t data_size);
/// `data` and `data_size` are out parameters.
/// `*data` should be freed.
DbRes db_product_image_with_product_id(
    Db* db, uint8_t** data, size_t* data_size, int64_t product_id);
