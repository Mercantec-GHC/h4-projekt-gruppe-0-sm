#include "../json/json.h"
#include "models.h"

#define DEFINE_MODEL_JSON(TYPE, PREFIX)                                        \
    char* PREFIX##_to_json_string(const TYPE* model);                          \
    int PREFIX##_from_json(TYPE* model, const JsonValue* json);

DEFINE_MODEL_JSON(User, user)
DEFINE_MODEL_JSON(Coord, coord)
DEFINE_MODEL_JSON(Product, product)
DEFINE_MODEL_JSON(ProductPrice, product_price)
DEFINE_MODEL_JSON(Cart, cart)
DEFINE_MODEL_JSON(CartItem, cart_item)

DEFINE_MODEL_JSON(UsersRegisterReq, users_register_req)
DEFINE_MODEL_JSON(AuthLoginReq, auth_login_req)
