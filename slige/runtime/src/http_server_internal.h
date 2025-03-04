#pragma once

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
    int client_file;
    SockAddrIn client_addr;
} Request;

/// This shit is implemented as a static size fifo buffer.
typedef struct {
    Request* data;
    size_t capacity;
    size_t back;
    size_t front;
} RequestQueue;

/// On ok, returns 0.
/// On error, returns -1.
int request_queue_construct(RequestQueue* queue, size_t capacity);
void request_queue_destroy(RequestQueue* queue);

/// On ok, returns 0.
/// On error, returns -1 if queue is full.
int request_queue_push(RequestQueue* queue, Request req);
size_t request_queue_size(const RequestQueue* queue);

/// On ok, returns 0.
/// On error, returns -1 if queue is empty.
int request_queue_pop(RequestQueue* queue, Request* req);

typedef struct {
    pthread_mutex_t mutex;
    pthread_cond_t cond;
    RequestQueue req_queue;
} ServerCtx;

void server_ctx_construct(ServerCtx* ctx);
void server_ctx_destroy(ServerCtx* ctx);

typedef struct {
    pthread_t thread;
    ServerCtx* ctx;
} Worker;

/// On ok, returns 0.
/// On error, returns -1;
int worker_construct(Worker* worker, ServerCtx* ctx);
void worker_destroy(Worker* worker);
void* worker_thread_fn(void* data);
void worker_thread_cleanup(void* data);
void worker_listen(Worker* worker);
void worker_handle_request(Worker* worker, Request* req);

struct HttpServer {
    int file;
    SockAddrIn addr;
    ServerCtx ctx;
    Worker* workers;
    size_t workers_size;
};

#define MAX_HEADER_BUFFER_SIZE 8192

#define MAX_PATH_SIZE 128
#define MAX_HEADERS_SIZE 32
#define MAX_HEADER_KEY_SIZE 32
#define MAX_HEADER_VALUE_SIZE 64

typedef enum {
    HttpMethod_GET,
    HttpMethod_POST,
} HttpMethod;

typedef struct {
    char* key;
    char* value;
} HttpHeader;

typedef struct {
    HttpMethod method;
    char* path;
    HttpHeader* headers;
    size_t headers_size;
} HttpReq;

/// On error, returns -1.
int http_parse_header(HttpReq* req, const char* buf, size_t buf_size);
void http_req_destroy(HttpReq* req);
bool http_req_has_header(HttpReq* req, const char* key);
const char* http_req_get_header(HttpReq* req, const char* key);
