#pragma once

#include "../collections/collection.h"
#include <netinet/in.h>
#include <sys/socket.h>

typedef struct sockaddr SockAddr;
typedef struct sockaddr_in SockAddrIn;

typedef struct {
    int file;
    SockAddrIn addr;
} ClientConnection;

DEFINE_STATIC_QUEUE(ClientConnection, ClientQueue, client_queue)
