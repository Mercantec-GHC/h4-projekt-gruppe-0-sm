#include "models.h"
#include "../json/json.h"
#include "../util/panic.h"
#include "../util/str.h"
#include "models_json.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>

void user_destroy(User* m)
{
    static_assert(sizeof(User) == 40, "model has changed");

    free(m->name);
    free(m->email);
    free(m->password_hash);
}

void coord_destroy(Coord* m)
{
    static_assert(sizeof(Coord) == 24, "model has changed");

    (void)m;
}

void product_destroy(Product* m)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    free(m->name);
    free(m->description);
    free(m->barcode);
}

void product_price_destroy(ProductPrice* m)
{
    static_assert(sizeof(ProductPrice) == 24, "model has changed");

    (void)m;
}

void users_register_req_destroy(UsersRegisterReq* model)
{
    static_assert(sizeof(UsersRegisterReq) == 24, "model has changed");

    free(model->name);
    free(model->email);
    free(model->password);
}

void sessions_login_req_destroy(SessionsLoginReq* model)
{
    static_assert(sizeof(SessionsLoginReq) == 16, "model has changed");

    free(model->email);
    free(model->password);
}

void carts_purchase_req_destroy(CartsPurchaseReq* model)
{
    static_assert(sizeof(CartsPurchaseReq) == 24, "model has changed");

    carts_item_vec_destroy(&model->items);
}

char* user_to_json_string(const User* m)
{
    static_assert(sizeof(User) == 40, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"name\":\"%s\","
        "\"email\":\"%s\","
        "\"password_hash\":\"%s\","
        "\"balance_dkk_cent\":%ld"
        "}",
        m->id,
        m->name,
        m->email,
        m->password_hash,
        m->balance_dkk_cent);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* coord_to_json_string(const Coord* m)
{
    static_assert(sizeof(Coord) == 24, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"x\":%ld,"
        "\"y\":%ld"
        "}",
        m->id,
        m->x,
        m->y);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* product_to_json_string(const Product* m)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"name\":\"%s\","
        "\"description\":\"%s\","
        "\"price_dkk_cent\":%ld,"
        "\"coord_id\":%ld,"
        "\"barcode\":\"%s\""
        "}",
        m->id,
        m->name,
        m->description,
        m->price_dkk_cent,
        m->coord_id,
        m->barcode);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* product_price_to_json_string(const ProductPrice* m)
{
    static_assert(sizeof(ProductPrice) == 24, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"product_id\":%ld,"
        "\"price_dkk_cent\":%ld"
        "}",
        m->id,
        m->product_id,
        m->price_dkk_cent);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* users_register_req_to_json(const UsersRegisterReq* m)
{
    static_assert(sizeof(UsersRegisterReq) == 24, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"name\":\"%s\","
        "\"email\":\"%s\","
        "\"password\":\"%s\""
        "}",
        m->name,
        m->email,
        m->password);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* sessions_login_req_to_json(const SessionsLoginReq* m)
{
    static_assert(sizeof(SessionsLoginReq) == 16, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"email\":\"%s\","
        "\"password\":\"%s\""
        "}",
        m->email,
        m->password);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* carts_purchase_req_to_json(const CartsPurchaseReq* m)
{
    static_assert(sizeof(CartsPurchaseReq) == 24, "model has changed");

    PANIC("not implemented");
}

typedef struct {
    const char* key;
    JsonType type;
} ObjField;

static inline bool obj_conforms(
    const JsonValue* val, const ObjField* fields, size_t fields_size)
{
    if (!json_is(val, JsonType_Object)) {
        return false;
    }
    for (size_t i = 0; i < fields_size; ++i) {
        if (!json_object_has(val, fields[i].key)) {
            return false;
        }
        if (!json_is(json_object_get(val, fields[i].key), fields[i].type)) {
            return false;
        }
    }
    return true;
}

#define OBJ_GET_INT(JSON, K) json_int(json_object_get(JSON, K))
#define OBJ_GET_STR(JSON, K) str_dup(json_string(json_object_get(JSON, K)))

#define OBJ_CONFORMS(JSON, FIELDS)                                             \
    obj_conforms(JSON, FIELDS, sizeof(FIELDS) / sizeof(FIELDS[0]))

#define GET_INT(K) OBJ_GET_INT(json, K)
#define GET_STR(K) OBJ_GET_STR(json, K)

int user_from_json(User* m, const JsonValue* json)
{
    static_assert(sizeof(User) == 40, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "name", JsonType_String },
        { "email", JsonType_String },
        { "password_hash", JsonType_String },
        { "balance_dkk_cent", JsonType_Number },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (User) {
        .id = GET_INT("id"),
        .name = GET_STR("name"),
        .email = GET_STR("email"),
        .password_hash = GET_STR("password_hash"),
        .balance_dkk_cent = GET_INT("balance_dkk_cent"),
    };
    return 0;
}

int coord_from_json(Coord* m, const JsonValue* json)
{
    static_assert(sizeof(Coord) == 24, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "x", JsonType_Number },
        { "y", JsonType_Number },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (Coord) {
        .id = GET_INT("id"),
        .x = GET_INT("x"),
        .y = GET_INT("y"),
    };
    return 0;
}

int product_from_json(Product* m, const JsonValue* json)
{
    static_assert(sizeof(Product) == 48, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "name", JsonType_String },
        { "description", JsonType_String },
        { "price_dkk_cent", JsonType_Number },
        { "coord_id", JsonType_Number },
        { "barcode", JsonType_String },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (Product) {
        .id = GET_INT("id"),
        .name = GET_STR("name"),
        .description = GET_STR("description"),
        .price_dkk_cent = GET_INT("price_dkk_cent"),
        .coord_id = GET_INT("coord_id"),
        .barcode = GET_STR("y"),
    };
    return 0;
}

int product_price_from_json(ProductPrice* m, const JsonValue* json)
{
    static_assert(sizeof(ProductPrice) == 24, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "product_id", JsonType_Number },
        { "price_dkk_cent", JsonType_Number },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (ProductPrice) {
        .id = GET_INT("id"),
        .product_id = GET_INT("product_id"),
        .price_dkk_cent = GET_INT("price_dkk_cent"),
    };
    return 0;
}

int users_register_req_from_json(UsersRegisterReq* m, const JsonValue* json)
{
    static_assert(sizeof(UsersRegisterReq) == 24, "model has changed");

    ObjField fields[] = {
        { "name", JsonType_String },
        { "email", JsonType_String },
        { "password", JsonType_String },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (UsersRegisterReq) {
        .name = GET_STR("name"),
        .email = GET_STR("email"),
        .password = GET_STR("password"),
    };
    return 0;
}

int sessions_login_req_from_json(SessionsLoginReq* m, const JsonValue* json)
{
    static_assert(sizeof(SessionsLoginReq) == 16, "model has changed");

    ObjField fields[] = {
        { "email", JsonType_String },
        { "password", JsonType_String },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (SessionsLoginReq) {
        .email = GET_STR("email"),
        .password = GET_STR("password"),
    };
    return 0;
}

int carts_purchase_req_from_json(CartsPurchaseReq* m, const JsonValue* json)
{
    static_assert(sizeof(CartsPurchaseReq) == 24, "model has changed");

    ObjField fields[] = {
        { "items", JsonType_Array },
    };
    if (!OBJ_CONFORMS(json, fields))
        return -1;
    *m = (CartsPurchaseReq) {
        .items = (CartsItemVec) { 0 },
    };
    carts_item_vec_construct(&m->items);

    const JsonValue* items = json_object_get(json, "items");
    size_t items_size = json_array_size(items);

    for (size_t i = 0; i < items_size; ++i) {
        const JsonValue* item = json_array_get(items, i);

        ObjField item_fields[] = {
            { "product_id", JsonType_Number },
            { "amount", JsonType_Number },
        };
        if (!OBJ_CONFORMS(item, item_fields)) {
            carts_item_vec_destroy(&m->items);
            return -1;
        }

        carts_item_vec_push(&m->items,
            (CartsItem) {
                .product_id = OBJ_GET_INT(item, "product_id"),
                .amount = OBJ_GET_INT(item, "amount"),
            });
    }

    return 0;
}

DEFINE_VEC_IMPL(CartsItem, CartsItemVec, carts_item_vec, )
