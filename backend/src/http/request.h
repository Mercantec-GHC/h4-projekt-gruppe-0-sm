#pragma once

#include "packet.h"
#include <stdint.h>

typedef struct {
    Method method;
    char* path;
    char* query;
    HeaderVec headers;
    uint8_t* body;
    size_t body_size;
} Request;

/// On error, returns -1.
int http_request_parse(
    Request* req, size_t* body_idx, const char* const buf, size_t buf_size);
void http_request_destroy(Request* req);
bool http_request_has_header(const Request* req, const char* key);
const char* http_request_get_header(const Request* req, const char* key);
