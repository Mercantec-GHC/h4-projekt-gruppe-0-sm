#pragma once

#include "../collections/collection.h"
#include "client_connection.h"
#include "http.h"
#include "packet.h"
#include "request.h"
#include "worker.h"
#include <bits/pthreadtypes.h>
#include <netinet/in.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <unistd.h>

typedef struct {
    const char* path;
    Method method;
    HttpHandlerFn handler;
} Handler;

DEFINE_VEC(Handler, HandlerVec, handler_vec, 8)

struct HttpServer {
    int fd;
    SockAddrIn addr;
    WorkerCtx ctx;
    Worker* workers;
    size_t workers_size;
    HandlerVec handlers;
    HttpHandlerFn not_found_handler;
    void* user_ctx;
};

struct HttpCtx {
    ClientConnection* client;
    const Request* req;
    const char* req_body;
    HeaderVec res_headers;
    void* user_ctx;
};

const char* http_response_code_string(int code);
