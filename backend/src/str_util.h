#pragma once

#include "collection.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

char* str_dup(const char* str);

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
void string_push_fmt_va(String* string, const char* fmt, ...);
char* string_copy(const String* string);

#define string_pushf(STRING, ...) string_push_fmt_va(STRING, __VA_ARGS__)

DEFINE_VEC(char*, RawStrVec, rawstr_vec, 8)

#define MAX_HASH_INPUT_LEN 256 - 1

char* str_hash(const char* input);
bool str_hash_equal(const char* hash, const char* input);

void str_util_test(void);
