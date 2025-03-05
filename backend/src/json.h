#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef enum {
    JsonType_Error,
    JsonType_Null,
    JsonType_Bool,
    JsonType_Number,
    JsonType_String,
    JsonType_Array,
    JsonType_Object,
} JsonType;

typedef struct JsonValue JsonValue;

bool json_is(const JsonValue* value, JsonType type);
bool json_bool(const JsonValue* value);
int64_t json_int(const JsonValue* value);
double json_float(const JsonValue* value);
const char* json_string(const JsonValue* value);
size_t json_array_size(const JsonValue* value);
const JsonValue* json_array_get(const JsonValue* value, size_t idx);
bool json_object_has(const JsonValue* value, const char* key);
const JsonValue* json_object_get(const JsonValue* value, const char* key);

void json_free(JsonValue* value);
JsonValue* json_parse(const char* text, size_t text_len);

typedef struct {
    const char* text;
    size_t text_len;
    size_t i;
    char ch;

    char curr_tok;
    char* curr_val;
} JsonParser;

void json_parser_construct(
    JsonParser* parser, const char* text, size_t text_len);
void json_parser_destroy(JsonParser* parser);
JsonValue* json_parser_parse(JsonParser* parser);
