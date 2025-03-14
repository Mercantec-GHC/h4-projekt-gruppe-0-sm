#pragma once

#include "../collections/collection.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

char* str_dup(const char* str);

typedef struct {
    const char* ptr;
    size_t len;
} StrSlice;

const char* str_slice_copy(const StrSlice* slice);

typedef struct {
    const char* text;
    size_t text_len;
    size_t i;
    const char* split;
    size_t split_len;
} StrSplitter;

StrSplitter str_splitter(const char* text, size_t text_len, const char* split);
StrSlice str_split_next(StrSplitter* splitter);

DEFINE_VEC(char, String, string)

void string_push_str(String* string, const char* str);
void string_push_fmt_va(String* string, const char* fmt, ...);
char* string_copy(const String* string);

#define string_pushf(STRING, ...) string_push_fmt_va(STRING, __VA_ARGS__)

DEFINE_VEC(char*, RawStrVec, rawstr_vec)

#define MAX_HASH_INPUT_LEN 256 - 1

char* str_hash(const char* input);
bool str_hash_equal(const char* hash, const char* input);

uint64_t str_fast_hash(const char* input);

char* str_random(size_t length);

#ifdef RUN_TESTS
void test_util_str(void);
#endif
