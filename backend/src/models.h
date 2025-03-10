#pragma once

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
    int64_t price_dkk_cent;
    int64_t coord_id;
    char* barcode;
} Product;

typedef struct {
    int64_t id;
    int64_t product_id;
    int64_t price_dkk_cent;
} ProductPrice;

typedef struct {
    int64_t id;
    int64_t user_id;
} Cart;

typedef struct {
    int64_t id;
    int64_t cart_id;
    int64_t amount;
} CartItem;

void user_destroy(User* model);
void coord_destroy(Coord* model);
void product_destroy(Product* model);
void product_price_destroy(ProductPrice* model);
void cart_destroy(Cart* model);
void cart_item_destroy(CartItem* model);

//

typedef struct {
    char* name;
    char* email;
    char* password;
} UsersRegisterReq;

typedef struct {
    char* email;
    char* password;
} AuthLoginReq;

void users_register_req_destroy(UsersRegisterReq* model);
void auth_login_req_destroy(AuthLoginReq* model);
