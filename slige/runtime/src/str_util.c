#include "str_util.h"
#include <stddef.h>
#include <string.h>

StrSplitter str_split(const char* text, size_t text_len, const char* split)
{
    return (StrSplitter) {
        .text = text,
        .text_len = text_len,
        .i = 0,
        .split = split,
        .split_len = strlen(split),
    };
}

StrSlice strsplit_next(StrSplitter* splitter)
{
    for (size_t i = splitter->i; i < splitter->text_len; ++i) {
        if (strncmp(&splitter->text[i], splitter->split, splitter->split_len)
            == 0) {
            const char* ptr = &splitter->text[splitter->i];
            size_t len = i - splitter->i;
            splitter->i = i + splitter->split_len;
            return (StrSlice) { ptr, len };
        }
    }
    return (StrSlice) {
        .ptr = &splitter->text[splitter->i],
        .len = splitter->text_len - splitter->i,
    };
}

void string_push_str(String* string, const char* str)
{
    for (size_t i = 0; i < strlen(str); ++i) {
        string_push(string, str[i]);
    }
}

char* string_copy(const String* string)
{
    char* copy = malloc(string->size + 1);
    strncpy(copy, string->data, string->size);
    copy[string->size] = '\0';
    return copy;
}
