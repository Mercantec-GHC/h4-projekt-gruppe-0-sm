#include "str.h"
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

char* str_slice_copy(const StrSlice* slice)
{
    char* copy = malloc(slice->len + 1);
    strncpy(copy, slice->ptr, slice->len);
    copy[slice->len] = '\0';
    return copy;
}

StrSplitter str_splitter(const char* text, size_t text_len, const char* split)
{
    return (StrSplitter) {
        .text = text,
        .text_len = text_len,
        .i = 0,
        .split = split,
        .split_len = strlen(split),
    };
}

StrSlice str_split_next(StrSplitter* splitter)
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
    StrSlice slice = {
        .ptr = &splitter->text[splitter->i],
        .len = splitter->text_len - splitter->i,
    };
    splitter->i = splitter->text_len;
    return slice;
}

DEFINE_VEC_IMPL(char, String, string_data, )

int string_construct(String* string)
{
    int res = string_data_construct(string);
    if (res != 0)
        return res;
    res = string_data_push(string, '\0');
    if (res != 0)
        return res;
    string->size -= 1;
    return 0;
}

void string_destroy(String* string)
{
    string_data_destroy(string);
}

int string_push(String* string, char value)
{
    int res = string_data_push(string, value);
    if (res != 0)
        return res;
    res = string_data_push(string, '\0');
    if (res != 0)
        return res;
    string->size -= 1;
    return 0;
}

int string_push_str(String* string, const char* str)
{
    size_t len = strlen(str);
    for (size_t i = 0; i < len; ++i) {
        int res = string_data_push(string, str[i]);
        if (res != 0)
            return res;
    }

    int res = string_data_push(string, '\0');
    if (res != 0)
        return res;
    string->size -= 1;
    return 0;
}

int string_push_fmt_va(String* string, const char* fmt, ...)
{
    va_list args1;
    va_start(args1, fmt);
    va_list args2;
    va_copy(args2, args1);

    size_t buffer_size = (size_t)vsnprintf(NULL, 0, fmt, args1) + 1;
    char* buf = malloc(buffer_size);
    va_end(args1);

    vsnprintf(buf, buffer_size, fmt, args2);
    va_end(args2);

    return string_push_str(string, buf);
}

char* string_copy(const String* string)
{
    char* copy = malloc(string->size + 1);
    strncpy(copy, string->data, string->size);
    copy[string->size] = '\0';
    return copy;
}

DEFINE_VEC_IMPL(char*, RawStrVec, rawstr_vec, )

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

static inline uint64_t chibihash64__load32le(const uint8_t* p)
{
    return (uint64_t)p[0] << 0 | (uint64_t)p[1] << 8 | (uint64_t)p[2] << 16
        | (uint64_t)p[3] << 24;
}
static inline uint64_t chibihash64__load64le(const uint8_t* p)
{
    return chibihash64__load32le(p) | (chibihash64__load32le(p + 4) << 32);
}
static inline uint64_t chibihash64__rotl(uint64_t x, int n)
{
    return (x << n) | (x >> (-n & 63));
}

static inline uint64_t chibihash64(
    const void* keyIn, ptrdiff_t len, uint64_t seed)
{
    const uint8_t* p = (const uint8_t*)keyIn;
    ptrdiff_t l = len;

    const uint64_t K = UINT64_C(0x2B7E151628AED2A7); // digits of e
    uint64_t seed2
        = chibihash64__rotl(seed - K, 15) + chibihash64__rotl(seed - K, 47);
    uint64_t h[4] = { seed, seed + K, seed2, seed2 + (K * K ^ K) };

    // depending on your system unrolling might (or might not) make things
    // a tad bit faster on large strings. on my system, it actually makes
    // things slower.
    // generally speaking, the cost of bigger code size is usually not
    // worth the trade-off since larger code-size will hinder inlinability
    // but depending on your needs, you may want to uncomment the pragma
    // below to unroll the loop.
    // #pragma GCC unroll 2
    for (; l >= 32; l -= 32) {
        for (int i = 0; i < 4; ++i, p += 8) {
            uint64_t stripe = chibihash64__load64le(p);
            h[i] = (stripe + h[i]) * K;
            h[(i + 1) & 3] += chibihash64__rotl(stripe, 27);
        }
    }

    for (; l >= 8; l -= 8, p += 8) {
        h[0] ^= chibihash64__load32le(p + 0);
        h[0] *= K;
        h[1] ^= chibihash64__load32le(p + 4);
        h[1] *= K;
    }

    if (l >= 4) {
        h[2] ^= chibihash64__load32le(p);
        h[3] ^= chibihash64__load32le(p + l - 4);
    } else if (l > 0) {
        h[2] ^= p[0];
        h[3] ^= p[l / 2] | ((uint64_t)p[l - 1] << 8);
    }

    h[0] += chibihash64__rotl(h[2] * K, 31) ^ (h[2] >> 31);
    h[1] += chibihash64__rotl(h[3] * K, 31) ^ (h[3] >> 31);
    h[0] *= K;
    h[0] ^= h[0] >> 31;
    h[1] += h[0];

    uint64_t x = (uint64_t)len * K;
    x ^= chibihash64__rotl(x, 29);
    x += seed;
    x ^= h[1];

    x ^= chibihash64__rotl(x, 15) ^ chibihash64__rotl(x, 42);
    x *= K;
    x ^= chibihash64__rotl(x, 13) ^ chibihash64__rotl(x, 31);

    return x;
}

uint64_t str_fast_hash(const char* input)
{
    return chibihash64(input, sizeof(char*), 0x80085);
}

char* str_random(size_t length)
{
    char* string = calloc(length + 1, sizeof(char));
    size_t string_i = 0;
    for (size_t i = 0; i < length; ++i) {
        int r = rand() % (10 + 26 + 26);
        if (r < 10) {
            string[string_i++] = (char)r + '0';
        } else if (r < 10 + 26) {
            string[string_i++] = (char)(r - 10) + 'A';
        } else {
            string[string_i++] = (char)(r - 10 - 26) + 'a';
        }
    }
    return string;
}

#ifdef INCLUDE_TESTS
void test_util_str(void)
{
    {
        char* hash = str_hash("1234");
        if (!str_hash_equal(hash, "1234")) {
            PANIC("hash should be equal");
        }
        if (str_hash_equal(hash, "4321")) {
            PANIC("hash should not be equal");
        }
        free(hash);
    }
    {
        char* token_1 = str_random(16);
        char* token_2 = str_random(16);
        if (strcmp(token_1, token_2) == 0) {
            PANIC("tokens should not be equal");
        }
        free(token_1);
        free(token_2);
    }
}
#endif
