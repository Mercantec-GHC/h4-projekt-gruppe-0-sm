#include "models.h"
#include "json.h"
#include "str_util.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>

void user_free(User* m)
{
    free(m->name);
    free(m->email);
    free(m->password_hash);
}

void coord_free(Coord* m)
{
    (void)m;
}

void product_free(Product* m)
{
    free(m->name);
    free(m->barcode);
}

void product_price_free(ProductPrice* m)
{
    (void)m;
}

void cart_free(Cart* m)
{
    (void)m;
}

void cart_item_free(CartItem* m)
{
    (void)m;
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
        m->id, m->name, m->email, m->password_hash, m->balance_dkk_cent);

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
        m->id, m->x, m->y);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* product_to_json_string(const Product* m)
{
    static_assert(sizeof(Product) == 40, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"name\":\"%s\","
        "\"price_dkk_cent\":%ld,"
        "\"coord_id\":%ld,"
        "\"barcode\":\"%s\""
        "}",
        m->id, m->name, m->price_dkk_cent, m->coord_id, m->barcode);

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
        m->id, m->product_id, m->price_dkk_cent);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* cart_to_json_string(const Cart* m)
{
    static_assert(sizeof(Cart) == 16, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"user_id\":%ld"
        "}",
        m->id, m->user_id);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* cart_item_to_json_string(const CartItem* m)
{
    static_assert(sizeof(CartItem) == 24, "model has changed");

    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"cart_id\":%ld,"
        "\"amount\":%ld"
        "}",
        m->id, m->cart_id, m->amount);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
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

#define GET_INT(K) json_int(json_object_get(json, K))
#define GET_STR(K) str_dup(json_string(json_object_get(json, K)))

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
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
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
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
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
    static_assert(sizeof(Product) == 40, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "name", JsonType_String },
        { "price_dkk_cent", JsonType_Number },
        { "coord_id", JsonType_Number },
        { "barcode", JsonType_String },
    };
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
        return -1;
    *m = (Product) {
        .id = GET_INT("id"),
        .name = GET_STR("name"),
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
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
        return -1;
    *m = (ProductPrice) {
        .id = GET_INT("id"),
        .product_id = GET_INT("product_id"),
        .price_dkk_cent = GET_INT("price_dkk_cent"),
    };
    return 0;
}

int cart_from_json(Cart* m, const JsonValue* json)
{
    static_assert(sizeof(Cart) == 16, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "user_id", JsonType_Number },
    };
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
        return -1;
    *m = (Cart) {
        .id = GET_INT("id"),
        .user_id = GET_INT("user_id"),
    };
    return 0;
}

int cart_item_from_json(CartItem* m, const JsonValue* json)
{
    static_assert(sizeof(CartItem) == 24, "model has changed");

    ObjField fields[] = {
        { "id", JsonType_Number },
        { "cart_id", JsonType_Number },
        { "amount", JsonType_Number },
    };
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
        return -1;
    *m = (CartItem) {
        .id = GET_INT("id"),
        .cart_id = GET_INT("cart_id"),
        .amount = GET_INT("amount"),
    };
    return 0;
}
