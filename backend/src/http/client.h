#pragma once

#include "client_connection.h"
#include "request.h"
#include <stdint.h>

#define CLIENT_BUFFER_SIZE 8192

typedef struct {
    ClientConnection connection;
    size_t buffer_i;
    size_t buffer_size;
    uint8_t buffer[];
} Client;

Client* http_client_new(ClientConnection connection);
void http_client_free(Client* client);

// Returns not 0 on error
int http_client_next(Client* client, Request* request);
