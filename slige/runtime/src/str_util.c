#include "str_util.h"
#include <openssl/rand.h>
#include <openssl/sha.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
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
static inline StrHash str_hash_with_salt(const char* str, const uint8_t* salt)
{
    if (strlen(str) >= MAX_HASH_INPUT_LEN - 1) {
        fprintf(stderr, "error: tried to hash too long input\n");
        exit(1);
    }

    StrHash hash;
    memcpy(hash.salt, salt, STR_HASH_SALT_SIZE);

    uint8_t input[MAX_HASH_INPUT_LEN + STR_HASH_SALT_SIZE] = { 0 };
    memcpy(input, hash.salt, STR_HASH_SALT_SIZE);
    memcpy(&input[STR_HASH_SALT_SIZE], str, strlen(str));

    SHA256(input, strlen((char*)input), hash.hash);
    return hash;
}

StrHash str_hash(const char* str)
{
    uint8_t salt[STR_HASH_SALT_SIZE];
    RAND_bytes(salt, STR_HASH_SALT_SIZE);
    return str_hash_with_salt(str, salt);
}

bool str_hash_is_equal(StrHash hash, const char* str)
{
    StrHash other = str_hash_with_salt(str, hash.salt);
    return memcmp(hash.hash, other.hash, STR_HASH_HASH_SIZE) == 0;
}

char* str_hash_to_string(StrHash hash)
{
    char* result = calloc(STR_HASH_STR_LEN + 1, sizeof(char));
    for (size_t i = 0; i < STR_HASH_SALT_SIZE; ++i) {
        char bytestr[3] = { 0 };
        snprintf(bytestr, 3, "%02x", hash.salt[i]);
        result[i * 2] = bytestr[0];
        result[i * 2 + 1] = bytestr[1];
    }
    for (size_t i = 0; i < STR_HASH_HASH_SIZE; ++i) {
        char bytestr[3] = { 0 };
        snprintf(bytestr, 3, "%02x", hash.salt[i]);
        result[(STR_HASH_SALT_SIZE + i) * 2] = bytestr[0];
        result[(STR_HASH_SALT_SIZE + i) * 2 + 1] = bytestr[1];
    }
    return result;
}

StrHash str_hash_from_string(const char* str)
{
    uint8_t result[64] = { 0 };
    size_t result_i = 0;
    for (size_t i = 0; i < strlen(str) && result_i < 64; i += 2) {
        char bytestr[3] = { 0 };
        strncpy(bytestr, &str[i], 2);
        uint64_t byte = strtoul(bytestr, NULL, 16);
        result[result_i] = (uint8_t)byte;
        result_i += 1;
    }

    StrHash hash;
    // memcpy((uint8_t*)&hash, result, sizeof(result));
    for (size_t i = 0; i < 32; ++i) {
        hash.salt[i] = result[i];
        hash.hash[i] = result[32 + i];
    }
    return hash;
}
