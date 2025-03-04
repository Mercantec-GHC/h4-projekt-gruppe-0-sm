#pragma once

#include <stddef.h>
#include <stdint.h>

typedef struct HttpServer HttpServer;

typedef struct {
    uint16_t port;
    size_t worker_threads;
} HttpServerOpts;

/// On error, returns NULL and prints.
HttpServer* http_server_new(HttpServerOpts opts);
void http_server_free(HttpServer* server);

/// On error, returns -1;
int http_server_listen(HttpServer* server);

