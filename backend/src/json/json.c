#include "json.h"
#include "../collections/vec.h"
#include "../util/str.h"
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char* key;
    JsonValue* val;
} KV;

DEFINE_VEC(JsonValue*, Arr, arr)
DEFINE_VEC(KV, Obj, obj)

struct JsonValue {
    JsonType type;
    union {
        bool bool_val;
        char* str_val;
        Arr arr_val;
        Obj obj_val;
    };
};

bool json_is(const JsonValue* value, JsonType type)
{
    return value != NULL && value->type == type;
}

bool json_bool(const JsonValue* value)
{
    return value->bool_val;
}

int64_t json_int(const JsonValue* value)
{
    return strtoll(value->str_val, NULL, 10);
}

double json_float(const JsonValue* value)
{
    return strtof(value->str_val, NULL);
}

const char* json_string(const JsonValue* value)
{
    return value->str_val;
}

size_t json_array_size(const JsonValue* value)
{
    return value->arr_val.size;
}

const JsonValue* json_array_get(const JsonValue* value, size_t idx)
{
    return value->arr_val.data[idx];
}

bool json_object_has(const JsonValue* value, const char* key)
{
    for (size_t i = 0; i < value->obj_val.size; ++i) {
        KV* kv = &value->obj_val.data[i];
        if (strcmp(key, kv->key) == 0) {
            return true;
        }
    }
    return false;
}

const JsonValue* json_object_get(const JsonValue* value, const char* key)
{
    for (size_t i = 0; i < value->obj_val.size; ++i) {
        KV* kv = &value->obj_val.data[i];
        if (strcmp(key, kv->key) == 0) {
            return kv->val;
        }
    }
    return NULL;
}

void json_free(JsonValue* value)
{
    switch (value->type) {
        case JsonType_Error:
        case JsonType_Null:
        case JsonType_Bool:
            break;
        case JsonType_Number:
        case JsonType_String:
            free(value->str_val);
            break;
        case JsonType_Array:
            for (size_t i = 0; i < value->arr_val.size; ++i) {
                json_free(value->arr_val.data[i]);
            }
            arr_destroy(&value->arr_val);
            break;
        case JsonType_Object:
            for (size_t i = 0; i < value->obj_val.size; ++i) {
                free(value->obj_val.data[i].key);
                json_free(value->obj_val.data[i].val);
            }
            obj_destroy(&value->obj_val);
            break;
    }
    free(value);
}

JsonValue* json_parse(const char* text, size_t text_len)
{
    JsonParser p;
    json_parser_construct(&p, text, text_len);
    JsonValue* json = json_parser_parse(&p);
    json_parser_destroy(&p);
    return json;
}

#define TOK_EOF '\0'
#define TOK_ERROR 'e'
#define TOK_NULL 'n'
#define TOK_FALSE 'f'
#define TOK_TRUE 't'
#define TOK_NUMBER '0'
#define TOK_STRING '"'

static inline JsonValue* alloc(JsonValue init);
static inline void lex(JsonParser* p);
static inline void lstep(JsonParser* p);

void json_parser_construct(JsonParser* p, const char* text, size_t text_len)
{
    *p = (JsonParser) {
        text,
        text_len,
        .i = 0,
        .ch = text[0],
        .curr_tok = TOK_EOF,
        .curr_val = NULL,
    };
    lex(p);
}

void json_parser_destroy(JsonParser* p)
{
    (void)p;
}

static inline void free_unused_arr(Arr* arr)
{
    for (size_t i = 0; i < arr->size; ++i) {
        json_free(arr->data[i]);
    }
    arr_destroy(arr);
}

static inline void free_unused_obj(Obj* obj)
{
    for (size_t i = 0; i < obj->size; ++i) {
        free(obj->data[i].key);
        json_free(obj->data[i].val);
    }
    obj_destroy(obj);
}

JsonValue* json_parser_parse(JsonParser* p)
{
    switch (p->curr_tok) {
        case TOK_EOF:
            fprintf(stderr, "error: json: unexpected eof\n");
            return NULL;
        case TOK_ERROR:
            lex(p);
            return NULL;
        case TOK_NULL:
            lex(p);
            return alloc((JsonValue) { .type = JsonType_Null });
        case TOK_FALSE:
            lex(p);
            return alloc(
                (JsonValue) { .type = JsonType_Bool, .bool_val = false });
        case TOK_TRUE:
            lex(p);
            return alloc(
                (JsonValue) { .type = JsonType_Null, .bool_val = true });
        case TOK_NUMBER: {
            char* val = p->curr_val;
            lex(p);
            return alloc(
                (JsonValue) { .type = JsonType_Number, .str_val = val });
        }
        case TOK_STRING: {
            char* val = p->curr_val;
            lex(p);
            return alloc(
                (JsonValue) { .type = JsonType_String, .str_val = val });
        }
    }

    if (p->curr_tok == '[') {
        lex(p);
        Arr arr;
        arr_construct(&arr);
        {
            JsonValue* value = json_parser_parse(p);
            if (!value) {
                free_unused_arr(&arr);
                return NULL;
            }
            arr_push(&arr, value);
        }
        while (p->curr_tok != TOK_EOF && p->curr_tok != ']') {
            if (p->curr_tok != ',') {
                fprintf(stderr, "error: json: expected ',' in array\n");
                free_unused_arr(&arr);
                return NULL;
            }
            lex(p);
            JsonValue* value = json_parser_parse(p);
            if (!value) {
                free_unused_arr(&arr);
                return NULL;
            }
            arr_push(&arr, value);
        }
        if (p->curr_tok != ']') {
            fprintf(stderr, "error: json: expected ']' after array\n");
            free_unused_arr(&arr);
            return NULL;
        }
        lex(p);
        return alloc((JsonValue) { .type = JsonType_Array, .arr_val = arr });
    }

    if (p->curr_tok == '{') {
        lex(p);
        Obj obj;
        obj_construct(&obj);
        {
            if (p->curr_tok != '"') {
                fprintf(stderr, "error: json: expected '\"' in kv\n");
                free_unused_obj(&obj);
                return NULL;
            }
            char* key = p->curr_val;
            lex(p);
            if (p->curr_tok != ':') {
                fprintf(stderr, "error: json: expected ':' in kv\n");
                free_unused_obj(&obj);
                return NULL;
            }
            lex(p);
            JsonValue* value = json_parser_parse(p);
            if (!value) {
                free_unused_obj(&obj);
                return NULL;
            }
            obj_push(&obj, (KV) { key, value });
        }
        while (p->curr_tok != TOK_EOF && p->curr_tok != '}') {
            if (p->curr_tok != ',') {
                fprintf(stderr, "error: json: expected ',' in object\n");
                free_unused_obj(&obj);
                return NULL;
            }
            lex(p);

            if (p->curr_tok != '"') {
                fprintf(stderr, "error: json: expected '\"' in kv\n");
                free_unused_obj(&obj);
                return NULL;
            }
            char* key = p->curr_val;
            lex(p);
            if (p->curr_tok != ':') {
                fprintf(stderr, "error: json: expected ':' in kv\n");
                free_unused_obj(&obj);
                return NULL;
            }
            lex(p);
            JsonValue* value = json_parser_parse(p);
            if (!value) {
                free_unused_obj(&obj);
                return NULL;
            }
            obj_push(&obj, (KV) { key, value });
        }
        if (p->curr_tok != '}') {
            fprintf(stderr, "error: json: expected '}' after object\n");
            free_unused_obj(&obj);
            return NULL;
        }
        lex(p);
        return alloc((JsonValue) { .type = JsonType_Object, .obj_val = obj });
    }

    fprintf(stderr, "error: json: unexpeted token\n");
    return NULL;
}

static inline JsonValue* alloc(JsonValue init)
{
    JsonValue* value = malloc(sizeof(JsonValue));
    *value = init;
    return value;
}

static inline void lex(JsonParser* p)
{
    if (p->i >= p->text_len) {
        p->curr_tok = TOK_EOF;
        return;
    }
    switch (p->ch) {
        case ' ':
        case '\t':
        case '\r':
        case '\n':
            lstep(p);
            lex(p);
            return;
        case '[':
        case ']':
        case '{':
        case '}':
        case ',':
        case ':':
            p->curr_tok = p->ch;
            lstep(p);
            return;
        case '0':
            lstep(p);
            p->curr_tok = TOK_NUMBER;
            p->curr_val = str_dup("0");
            return;
    }
    if ((p->ch >= '1' && p->ch <= '9') || p->ch == '.') {
        String value;
        string_construct(&value);
        int dec_seps = 0;
        while (p->i < p->text_len
            && ((p->ch >= '0' && p->ch <= '9')
                || (p->ch == '.' && dec_seps <= 1))) {
            if (p->ch == '.') {
                dec_seps += 1;
            }
            string_push(&value, p->ch);
            lstep(p);
        }
        char* copy = string_copy(&value);
        string_destroy(&value);

        p->curr_tok = TOK_NUMBER;
        p->curr_val = copy;
        return;
    }
    if ((p->ch >= 'a' && p->ch <= 'z') || (p->ch >= 'A' && p->ch <= 'Z')) {
        String value;
        string_construct(&value);
        while (p->i < p->text_len
            && ((p->ch >= 'a' && p->ch <= 'z')
                || (p->ch >= 'A' && p->ch <= 'Z'))) {
            string_push(&value, p->ch);
            lstep(p);
        }
        if (strcmp(value.data, "null")) {
            p->curr_tok = TOK_NULL;
        } else if (strcmp(value.data, "false")) {
            p->curr_tok = TOK_FALSE;
        } else if (strcmp(value.data, "true")) {
            p->curr_tok = TOK_TRUE;
        } else {
            fprintf(
                stderr, "error: json: illegal keyword \"%s\"\n", value.data);
            p->curr_tok = TOK_ERROR;
        }
        string_destroy(&value);
        return;
    }
    if (p->ch == '"') {
        lstep(p);

        String value;
        string_construct(&value);

        while (p->i < p->text_len && p->text[p->i] != '"') {
            if (p->text[p->i] == '\\') {
                lstep(p);
                if (p->i >= p->text_len)
                    break;
                switch (p->ch) {
                    case '0':
                        string_push(&value, '\0');
                        break;
                    case 'n':
                        string_push(&value, '\n');
                        break;
                    case 'r':
                        string_push(&value, '\r');
                        break;
                    case 't':
                        string_push(&value, '\t');
                        break;
                    default:
                        string_push(&value, p->ch);
                        break;
                }
            } else {
                string_push(&value, p->ch);
            }
            lstep(p);
        }
        if (p->i >= p->text_len || p->text[p->i] != '"') {
            string_destroy(&value);
            fprintf(stderr, "error: json: bad string\n");
            p->curr_tok = TOK_ERROR;
            return;
        }
        lstep(p);

        char* copy = string_copy(&value);
        string_destroy(&value);

        p->curr_tok = '"';
        p->curr_val = copy;
        return;
    }

    fprintf(stderr, "error: json: illegal char '%c'\n", p->ch);
    lstep(p);
    p->curr_tok = TOK_ERROR;
    return;
}

static inline void lstep(JsonParser* p)
{
    p->i += 1;
    p->ch = p->text[p->i];
}
