#pragma once

#include "collection.h"
#include "models.h"

DEFINE_VEC(int64_t, Ids, ids, 8)
DEFINE_VEC(Product, ProductVec, product_vec, 32)

typedef enum {
    DbRes_Ok,
    DbRes_NotFound,
    DbRes_Error,
} DbRes;

typedef struct Db Db;

/// `user.id` field is ignored.
DbRes db_user_insert(Db* db, const User* user);
/// `user` field is an out parameter. 
DbRes db_user_from_id(Db* db, User* user, int64_t id);


/// Expects `ids` to be constructed.
DbRes db_users_with_email(Db* db, Ids* ids, const char* email);


/// `user` is an out parameter.
DbRes db_user_from_email(Db* db, User* user, const char* email);

/// Expects `vec` to be constructed.
DbRes db_product_all(Db* db, ProductVec* vec);
