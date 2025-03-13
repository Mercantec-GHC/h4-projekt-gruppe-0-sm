#include "request.h"
#include "packet.h"
#include <ctype.h>
#include <netinet/in.h>
#include <pthread.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <threads.h>
#include <unistd.h>

void http_request_destroy(Request* req)
{
    free(req->path);
    for (size_t i = 0; i < req->headers.size; ++i) {
        free(req->headers.data[i].key);
        free(req->headers.data[i].value);
    }
    header_vec_destroy(&req->headers);
    if (req->body)
        free(req->body);
}

static inline int strcmp_lower(const char* a, const char* b)
{
    size_t i = 0;
    for (; a[i] != '\0' && b[i] != '\0'; ++i) {
        if (tolower(a[i]) != tolower(b[i])) {
            return 1;
        }
    }
    if (a[i] != b[i]) {
        return 1;
    }
    return 0;
}

bool http_request_has_header(const Request* req, const char* key)
{
    for (size_t i = 0; i < req->headers.size; ++i) {
        if (strcmp_lower(key, req->headers.data[i].key) == 0) {
            return true;
        }
    }
    return false;
}

const char* http_request_get_header(const Request* req, const char* key)
{
    for (size_t i = 0; i < req->headers.size; ++i) {
        if (strcmp_lower(key, req->headers.data[i].key) == 0) {
            return req->headers.data[i].value;
        }
    }
    return NULL;
}
