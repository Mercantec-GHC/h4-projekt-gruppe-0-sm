#include "str_util.h"
#include "panic.h"
#include <openssl/rand.h>
#include <openssl/sha.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char* str_dup(const char* str)
{
    char* clone = calloc(strlen(str) + 1, sizeof(char));
    strcpy(clone, str);
    return clone;
}

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

    string_push(string, '\0');
    string->size -= 1;
}

void string_push_fmt_va(String* string, const char* fmt, ...)
{
    va_list args1;
    va_start(args1, fmt);
    va_list args2;
    va_copy(args2, args1);
    char buf[1 + vsnprintf(NULL, 0, fmt, args1)];
    va_end(args1);
    vsnprintf(buf, sizeof buf, fmt, args2);
    va_end(args2);
    string_push_str(string, buf);
}

char* string_copy(const String* string)
{
    char* copy = malloc(string->size + 1);
    strncpy(copy, string->data, string->size);
    copy[string->size] = '\0';
    return copy;
}

#define STR_HASH_SALT_SIZE 32
#define STR_HASH_HASH_SIZE 32
#define STR_HASH_STR_LEN 128

typedef struct {
    uint8_t salt[STR_HASH_SALT_SIZE];
    uint8_t hash[STR_HASH_HASH_SIZE];
} HashData;

static inline HashData hashdata_from_str_and_salt(
    const char* str, const uint8_t* salt)
{
    if (strlen(str) >= MAX_HASH_INPUT_LEN) {
        fprintf(stderr, "error: tried to hash too long input\n");
        exit(1);
    }

    HashData hash;
    memcpy(hash.salt, salt, STR_HASH_SALT_SIZE);

    uint8_t input[MAX_HASH_INPUT_LEN + 1 + STR_HASH_SALT_SIZE] = { 0 };
    memcpy(input, hash.salt, STR_HASH_SALT_SIZE);
    memcpy(&input[STR_HASH_SALT_SIZE], str, strlen(str));

    SHA256(input, strlen((char*)input), hash.hash);
    return hash;
}

static inline HashData hashdata_from_str(const char* str)
{
    uint8_t salt[STR_HASH_SALT_SIZE];
    RAND_bytes(salt, STR_HASH_SALT_SIZE);
    return hashdata_from_str_and_salt(str, salt);
}

static inline bool hashdata_is_equal(HashData hash, const char* str)
{
    HashData other = hashdata_from_str_and_salt(str, hash.salt);
    return memcmp(hash.hash, other.hash, STR_HASH_HASH_SIZE) == 0;
}

static inline char* hashdata_to_string(HashData hash)
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
        snprintf(bytestr, 3, "%02x", hash.hash[i]);
        result[(STR_HASH_SALT_SIZE + i) * 2] = bytestr[0];
        result[(STR_HASH_SALT_SIZE + i) * 2 + 1] = bytestr[1];
    }
    return result;
}

static inline HashData hashdata_from_hash_string(const char* str)
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

    HashData hash;
    for (size_t i = 0; i < 32; ++i) {
        hash.salt[i] = result[i];
        hash.hash[i] = result[32 + i];
    }
    return hash;
}

char* str_hash(const char* input)
{
    HashData data = hashdata_from_str(input);
    return hashdata_to_string(data);
}

bool str_hash_equal(const char* hash, const char* input)
{
    HashData data = hashdata_from_hash_string(hash);
    return hashdata_is_equal(data, input);
}

void str_util_test(void) {
    char* hash = str_hash("1234");
    if (!str_hash_equal(hash, "1234")) {
        PANIC("hash should be equal");
    }
    if (str_hash_equal(hash, "4321")) {
        PANIC("hash should not be equal");
    }
    free(hash);
}
