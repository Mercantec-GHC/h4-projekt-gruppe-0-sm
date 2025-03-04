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

    uint8_t buffer[MAX_HEADER_BUFFER_SIZE] = { 0 };
    ssize_t bytes_received = recv(req->client_file, &buffer, sizeof(buffer), 0);

    if (bytes_received == -1) {
        fprintf(stderr, "error: could not receive request\n");
        goto f_return;
    }

    size_t header_end = 0;
    for (ssize_t i = 0; i < bytes_received - 3; ++i) {
        if (memcmp((char*)&buffer[i], "\r\n\r\n", 4)) {
            header_end = (size_t)i + 5;
        }
    }
    if (header_end == 0) {
        fprintf(stderr, "error: header too big, exceeded %d bytes\n",
            MAX_HEADER_BUFFER_SIZE);
        goto f_return;
    }
    puts((char*)buffer);

    HttpReq http_req;
    int res = http_parse_header(&http_req, (char*)buffer, header_end);
    if (res != 0) {
        fprintf(stderr, "error: failed to parse header\n");
        goto f_return;
    }

    if (http_req_has_header(&http_req, "Content-Length")) { }

    printf("headers:\n");
    for (size_t i = 0; i < http_req.headers_size; ++i) {
        HttpHeader* header = &http_req.headers[i];
        printf("'%s': '%s'\n", header->key, header->value);
    }

f_return:
    close(req->client_file);
}

int http_parse_header(HttpReq* req, const char* buf, size_t buf_size)
{
#define CHECK_OVERRUN                                                          \
    if (i >= buf_size) {                                                       \
        return -1;                                                             \
    }

    size_t i = 0;

    char method_buf[8] = { 0 };
    size_t method_buf_i = 0;
    for (; i < buf_size && method_buf_i < 8 && buf[i] != ' '; ++i) {
        method_buf[method_buf_i] = buf[i];
        method_buf_i += 1;
    }
    CHECK_OVERRUN;
    i += 1;

    HttpMethod method;
    if (strncmp(method_buf, "GET", 3) == 0) {
        method = HttpMethod_GET;
    } else if (strncmp(method_buf, "POST", 4) == 0) {
        method = HttpMethod_POST;
    } else {
        fprintf(stderr, "error: unrecognized http method '%.8s'\n", method_buf);
        return -1;
    }

    char* path = calloc(MAX_PATH_SIZE, sizeof(char));
    size_t path_i = 0;
    for (; i < buf_size && path_i < MAX_PATH_SIZE - 1 && buf[i] != ' '; ++i) {
        char ch = buf[i];
        path[path_i] = ch;
        path_i += 1;
    }
    CHECK_OVERRUN;

    for (; i < buf_size && buf[i] != '\r'; ++i) { }
    i += 2;
    CHECK_OVERRUN;

    HttpHeader* headers = malloc(sizeof(HttpHeader) * MAX_HEADERS_SIZE);
    size_t headers_size = 0;
    for (; i < buf_size && headers_size < MAX_HEADERS_SIZE && buf[i] != '\r';
        ++i) {

        i += 1;
        CHECK_OVERRUN;
        char* key = calloc(MAX_HEADER_KEY_SIZE, sizeof(char));
        size_t key_i = 0;
        for (; i < buf_size && key_i < MAX_HEADER_KEY_SIZE - 1 && buf[i] != ':';
            ++i) {
            key[key_i] = buf[i];
            key_i += 1;
        }
        i += 1;
        CHECK_OVERRUN;
        char* value = calloc(MAX_HEADER_VALUE_SIZE, sizeof(char));
        size_t value_i = 0;
        for (; i < buf_size && value_i < MAX_HEADER_VALUE_SIZE - 1
            && buf[i] != '\r';
            ++i) {
            value[value_i] = buf[i];
            value_i += 1;
        }
        i += 2;
        CHECK_OVERRUN;
        headers[headers_size] = (HttpHeader) { key, value };
        headers_size += 1;
    }

    *req = (HttpReq) {
        method,
        path,
        headers,
        headers_size,
    };
    return 0;
}

void http_req_destroy(HttpReq* req)
{
    free(req->path);
    for (size_t i = 0; i < req->headers_size; ++i) {
        free(req->headers[i].key);
        free(req->headers[i].value);
    }
    free(req->headers);
}

bool http_req_has_header(HttpReq* req, const char* key)
{
    for (size_t i = 0; i < req->headers_size; ++i) {
        if (strcmp(key, req->headers[i].key) == 0) {
            return true;
        }
    }
    return false;
}

const char* http_req_get_header(HttpReq* req, const char* key)
{
    for (size_t i = 0; i < req->headers_size; ++i) {
        if (strcmp(key, req->headers[i].key) == 0) {
            return req->headers[i].value;
        }
    }
    return NULL;
}
