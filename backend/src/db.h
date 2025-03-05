#pragma once

#include "collection.h"
#include "models.h"

DEFINE_VEC(Product, ProductVec, product_vec, 32)

typedef enum {
    DbRes_Ok,
    DbRes_NotFound,
    DbRes_Error,
} DbRes;

typedef struct Db Db;

/// `user.id` field is ignored.
DbRes db_user_insert(Db* db, User* user);
DbRes db_user_from_id(Db* db, User* user, int64_t id);

DbRes db_product_all_fill(Db* db, ProductVec* vec);
