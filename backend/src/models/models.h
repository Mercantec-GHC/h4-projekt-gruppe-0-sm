#pragma once

#include "../collections/collection.h"
#include <stdint.h>

typedef struct {
    int64_t id;
    char* name;
    char* email;
    char* password_hash;
    int64_t balance_dkk_cent;
} User;

typedef struct {
    int64_t id;
    int64_t x;
    int64_t y;
} Coord;

typedef struct {
    int64_t id;
    char* name;
    char* description;
    int64_t price_dkk_cent;
    int64_t coord_id;
    char* barcode;
} Product;

typedef struct {
    int64_t id;
    int64_t product_id;
    int64_t price_dkk_cent;
} ProductPrice;

void user_destroy(User* model);
void coord_destroy(Coord* model);
void product_destroy(Product* model);
void product_price_destroy(ProductPrice* model);

//

typedef struct {
    char* name;
    char* email;
    char* password;
} UsersRegisterReq;

void users_register_req_destroy(UsersRegisterReq* model);

typedef struct {
    char* email;
    char* password;
} SessionsLoginReq;

void sessions_login_req_destroy(SessionsLoginReq* model);

typedef struct {
    int64_t product_id;
    int64_t amount;
} CartsItem;

DECLARE_VEC_TYPE(CartsItem, CartsItemVec, carts_item_vec, )

typedef struct {
    CartsItemVec items;
} CartsPurchaseReq;

void carts_purchase_req_destroy(CartsPurchaseReq* model);
