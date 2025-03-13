#pragma once

#include "../collection.h"
#include <stdbool.h>

#define MAX_HEADER_BUFFER_SIZE 65536

#define MAX_PATH_LEN 128 - 1
#define MAX_QUERY_LEN 128 - 1
#define MAX_HEADERS_LEN 32
#define MAX_HEADER_KEY_LEN 32 - 1
#define MAX_HEADER_VALUE_LEN 512 - 1

typedef enum {
    Method_GET,
    Method_POST,
} Method;

typedef struct {
    char* key;
    char* value;
} Header;

DEFINE_VEC(Header, HeaderVec, header_vec, 8)
