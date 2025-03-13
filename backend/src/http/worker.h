#pragma once

#include "client_connection.h"
#include "http.h"
#include <bits/pthreadtypes.h>

typedef struct {
    const HttpServer* server;
    pthread_mutex_t mutex;
    pthread_cond_t cond;
    ClientQueue req_queue;
} WorkerCtx;

void http_worker_ctx_construct(WorkerCtx* ctx, const HttpServer* server);
void http_worker_ctx_destroy(WorkerCtx* ctx);

typedef struct {
    pthread_t thread;
    WorkerCtx* ctx;
} Worker;

void http_worker_construct(Worker* worker, WorkerCtx* ctx);
void http_worker_destroy(Worker* worker);
void* http_worker_thread_fn(void* data);
void http_worker_listen(Worker* worker);
void http_worker_handle_connection(Worker* worker, ClientConnection connection);
