#include "http_server.h"
#include "http_server_internal.h"
#include <netinet/in.h>
#include <pthread.h>
#include <signal.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <threads.h>
#include <unistd.h>

HttpServer* http_server_new(HttpServerOpts opts)
{

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd == -1) {
        fprintf(stderr, "error: could not initialize socket\n");
        return NULL;
    }

    SockAddrIn server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(opts.port);

    int reuse = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    int res = bind(server_fd, (SockAddr*)&server_addr, sizeof(server_addr));
    if (res != 0) {
        fprintf(stderr, "error: could not bind socket\n");
        return NULL;
    }

    res = listen(server_fd, 16);
    if (res != 0) {
        fprintf(stderr, "error: could not listen on socket\n");
        return NULL;
    }

    HttpServer* server = malloc(sizeof(HttpServer));
    *server = (HttpServer) {
        .file = server_fd,
        .addr = server_addr,
        // .ctx = {},
        .workers = malloc(sizeof(Worker) * opts.workers_amount),
        .workers_size = opts.workers_amount,
    };

    server_ctx_construct(&server->ctx);
    for (size_t i = 0; i < opts.workers_amount; ++i) {
        worker_construct(&server->workers[i], &server->ctx);
    }

    return server;
}

void http_server_free(HttpServer* server)
{
    close(server->file);
    for (size_t i = 0; i < server->workers_size; ++i) {
        worker_destroy(&server->workers[i]);
    }
    server_ctx_destroy(&server->ctx);
    free(server);
}

int http_server_listen(HttpServer* server)
{
    ServerCtx* ctx = &server->ctx;

    while (true) {
        SockAddrIn client_addr;
        socklen_t addr_size = sizeof(client_addr);

        int res = accept(server->file, (SockAddr*)&client_addr, &addr_size);
        if (res == -1) {
            fprintf(stderr, "error: could not accept\n");
            return -1;
        }

        Request req = { .client_file = res, client_addr };
        pthread_mutex_lock(&ctx->mutex);

        res = request_queue_push(&ctx->req_queue, req);
        if (res != 0) {
            fprintf(stderr, "error: request queue full\n");
            return -1;
        }
        pthread_mutex_unlock(&ctx->mutex);
        pthread_cond_signal(&ctx->cond);
    }
}

void server_ctx_construct(ServerCtx* ctx)
{
    pthread_mutex_init(&ctx->mutex, NULL);
    pthread_cond_init(&ctx->cond, NULL);
    request_queue_construct(&ctx->req_queue, 8192);
}

void server_ctx_destroy(ServerCtx* ctx)
{
    pthread_mutex_destroy(&ctx->mutex);
    pthread_cond_destroy(&ctx->cond);
    request_queue_destroy(&ctx->req_queue);
}

int request_queue_construct(RequestQueue* queue, size_t capacity)
{
    *queue = (RequestQueue) {
        .data = malloc(sizeof(Request) * capacity),
        .capacity = capacity,
        .back = 0,
        .front = 0,
    };
    return 0;
}

void request_queue_destroy(RequestQueue* queue)
{
    free(queue->data);
}

int request_queue_push(RequestQueue* queue, Request req)
{
    size_t front = queue->front + 1;
    if (front >= queue->capacity) {
        front = 0;
    }
    if (front == queue->back) {
        return -1;
    }
    queue->data[queue->front] = req;
    queue->front = front;
    return 0;
}

size_t request_queue_size(const RequestQueue* queue)
{
    return queue->front >= queue->back
        ? queue->front - queue->back
        : (queue->capacity - queue->back) + queue->front;
}

int request_queue_pop(RequestQueue* queue, Request* req)
{
    if (queue->back == queue->front) {
        return -1;
    }
    *req = queue->data[queue->back];
    size_t back = queue->back + 1;
    if (back >= queue->capacity) {
        back = 0;
    }
    queue->back = back;
    return 0;
}

int worker_construct(Worker* worker, ServerCtx* ctx)
{
    *worker = (Worker) {
        // .thread = {},
        .ctx = ctx,
    };

    pthread_create(&worker->thread, NULL, worker_thread_fn, worker);
    return 0;
}

void worker_destroy(Worker* worker)
{
    if (worker->thread != 0) {
        pthread_cancel(worker->thread);

        // a bit ugly, but who cares?
        pthread_cond_broadcast(&worker->ctx->cond);

        pthread_join(worker->thread, NULL);
    }
}

void* worker_thread_fn(void* data)
{
    Worker* worker = data;
    worker_listen(worker);
    return NULL;
}

void worker_listen(Worker* worker)
{
    ServerCtx* ctx = worker->ctx;
    while (true) {
        pthread_testcancel();

        pthread_mutex_lock(&ctx->mutex);
        pthread_cond_wait(&ctx->cond, &ctx->mutex);

        if (request_queue_size(&ctx->req_queue) == 0) {
            pthread_mutex_unlock(&ctx->mutex);
            continue;
        }

        Request req;
        request_queue_pop(&ctx->req_queue, &req);
        pthread_mutex_unlock(&ctx->mutex);

        worker_handle_request(worker, &req);
    }
}

void worker_handle_request(Worker* worker, Request* req)
{
    (void)worker;

    uint8_t buffer[MAX_HEADER_SIZE] = { 0 };
    ssize_t bytes_received = recv(req->client_file, &buffer, sizeof(buffer), 0);

    if (bytes_received == -1) {
        fprintf(stderr, "error: could not receive request\n");
        return;
    }

    size_t header_end = 0;
    for (ssize_t i = 0; i < bytes_received - 3; ++i) {
        if (memcmp((char*)&buffer[i], "\r\n\r\n", 4)) {
            header_end = (size_t)i + 5;
        }
    }
    if (header_end == 0) {
        fprintf(stderr, "error: header too big, exceeded %d bytes\n",
            MAX_HEADER_SIZE);
        return;
    }
    puts((char*)buffer);

    HttpReq http_req;
    http_parse_header(&http_req, (char*)buffer, header_end);

    close(req->client_file);
}

int http_parse_header(HttpReq* req, const char* header, size_t header_size)
{
}
