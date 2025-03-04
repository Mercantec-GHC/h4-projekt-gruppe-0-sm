#pragma once

#include <stddef.h>
#include <stdint.h>

typedef struct HttpServer HttpServer;

typedef struct {
    uint16_t port;
    size_t workers_amount;
} HttpServerOpts;

/// On ok, HttpServer
/// On error, returns NULL and prints.
HttpServer* http_server_new(HttpServerOpts opts);
void http_server_free(HttpServer* server);
/// On ok, returns 0.
/// On error, returns -1 and prints;
int http_server_listen(HttpServer* server);
