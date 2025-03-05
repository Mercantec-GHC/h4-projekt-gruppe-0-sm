#pragma once

#include "collection.h"
#include <stddef.h>

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
