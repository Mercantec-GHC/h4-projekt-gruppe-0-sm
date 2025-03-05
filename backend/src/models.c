#include "models.h"
#include "json.h"
#include "str_util.h"
#include <stdlib.h>
#include <string.h>

void user_free(User* m)
{
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
    String string;
    string_construct(&string);
    string_pushf(&string,
        "{"
        "\"id\":%ld,"
        "\"email\":\"%s\","
        "\"password_hash\":\"%s\","
        "\"balance_dkk_cent\":%ld"
        "}",
        m->id, m->email, m->password_hash, m->balance_dkk_cent);

    char* result = string_copy(&string);
    string_destroy(&string);
    return result;
}

char* coord_to_json_string(const Coord* m)
{
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

int user_from_json(User* m, const JsonValue* json)
{
    ObjField fields[] = {
        { "id", JsonType_Number },
        { "email", JsonType_String },
        { "password_hash", JsonType_String },
        { "balance_dkk_cent", JsonType_Number },
    };
    if (!obj_conforms(json, fields, sizeof(fields) / sizeof(fields[0])))
        return -1;
    *m = (User) {
        .id = json_int(json_object_get(json, "id")),
        .email = str_dup(json_string(json_object_get(json, "email"))),
        .password_hash
        = str_dup(json_string(json_object_get(json, "password_hash"))),
        .balance_dkk_cent = json_int(json_object_get(json, "balance_dkk_cent")),
    };
    return 0;
}
