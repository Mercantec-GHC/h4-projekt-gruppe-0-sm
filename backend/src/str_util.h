#pragma once

#include "collection.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
    const char* ptr;
    size_t len;
} StrSlice;

typedef struct {
    const char* text;
    size_t text_len;
    size_t i;
    const char* split;
    size_t split_len;
} StrSplitter;

StrSplitter str_split(const char* text, size_t text_len, const char* split);
StrSlice strsplit_next(StrSplitter* splitter);

DEFINE_VEC(char, String, string, 8)

void string_push_str(String* string, const char* str);
char* string_copy(const String* string);

DEFINE_VEC(char*, RawStrVec, rawstr_vec, 8)

#define MAX_HASH_INPUT_LEN 256

#define STR_HASH_SALT_SIZE 32
#define STR_HASH_HASH_SIZE 32
#define STR_HASH_STR_LEN 128

typedef struct {
    uint8_t salt[STR_HASH_SALT_SIZE];
    uint8_t hash[STR_HASH_HASH_SIZE];
} StrHash;

StrHash str_hash(const char* str);
bool str_hash_is_equal(StrHash hash, const char* str);
char* str_hash_to_string(StrHash hash);
StrHash str_hash_from_string(const char* str);
