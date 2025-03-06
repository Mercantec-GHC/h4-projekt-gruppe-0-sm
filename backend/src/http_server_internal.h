#pragma once

#include "collection.h"
#include "http_server.h"
#include <bits/pthreadtypes.h>
#include <netinet/in.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <unistd.h>

typedef struct sockaddr SockAddr;
typedef struct sockaddr_in SockAddrIn;

typedef struct {
    int file;
    SockAddrIn addr;
} Client;

DEFINE_STATIC_QUEUE(Client, ReqQueue, request_queue)

typedef struct {
    const HttpServer* server;
    pthread_mutex_t mutex;
    pthread_cond_t cond;
    ReqQueue req_queue;
} Cx;

static inline void ctx_construct(Cx* ctx, const HttpServer* server);
static inline void ctx_destroy(Cx* ctx);

typedef struct {
    pthread_t thread;
    Cx* ctx;
} Worker;

/// On ok, returns 0.
/// On error, returns -1;
static inline int worker_construct(Worker* worker, Cx* ctx);
static inline void worker_destroy(Worker* worker);
static inline void* worker_thread_fn(void* data);
static inline void worker_listen(Worker* worker);
static inline void worker_handle_request(Worker* worker, Client* req);

#define MAX_HEADER_BUFFER_SIZE 8192

#define MAX_PATH_LEN 128 - 1
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

typedef struct {
    Method method;
    char* path;
    HeaderVec headers;
} Req;

/// On error, returns -1.
static inline int parse_header(
    Req* req, size_t* body_idx, const char* const buf, size_t buf_size);
static inline void req_destroy(Req* req);
static inline bool req_has_header(const Req* req, const char* key);
static inline const char* req_get_header(const Req* req, const char* key);

typedef struct {
    const char* path;
    Method method;
    HttpHandlerFn handler;
} Handler;

DEFINE_VEC(Handler, HandlerVec, handler_vec, 8)

struct HttpServer {
    int file;
    SockAddrIn addr;
    Cx ctx;
    Worker* workers;
    size_t workers_size;
    HandlerVec handlers;
    HttpHandlerFn not_found_handler;
    void* user_ctx;
};

struct HttpCtx {
    Client* client;
    const Req* req;
    const char* req_body;
    HeaderVec res_headers;
    void* user_ctx;
};

const char* http_response_code_string(int code);
