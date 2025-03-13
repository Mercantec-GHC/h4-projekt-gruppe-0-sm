#include "worker.h"
#include "client.h"
#include "server.h"
#include <pthread.h>
#include <string.h>

void http_worker_ctx_construct(WorkerCtx* ctx, const HttpServer* server)
{
    ctx->server = server;
    pthread_mutex_init(&ctx->mutex, NULL);
    pthread_cond_init(&ctx->cond, NULL);
    client_queue_construct(&ctx->req_queue, 8192);
}

void http_worker_ctx_destroy(WorkerCtx* ctx)
{
    pthread_mutex_destroy(&ctx->mutex);
    pthread_cond_destroy(&ctx->cond);
    client_queue_destroy(&ctx->req_queue);
}

void http_worker_construct(Worker* worker, WorkerCtx* ctx)
{
    *worker = (Worker) {
        .thread = (pthread_t) { 0 },
        .ctx = ctx,
    };

    pthread_create(&worker->thread, NULL, http_worker_thread_fn, worker);
}

void http_worker_destroy(Worker* worker)
{
    if (worker->thread != 0) {
        pthread_cancel(worker->thread);

        // a bit ugly, but who cares?
        pthread_cond_broadcast(&worker->ctx->cond);

        pthread_join(worker->thread, NULL);
    }
}

void* http_worker_thread_fn(void* data)
{
    Worker* worker = data;
    http_worker_listen(worker);
    return NULL;
}

void http_worker_listen(Worker* worker)
{
    WorkerCtx* ctx = worker->ctx;
    while (true) {
        pthread_testcancel();

        pthread_mutex_lock(&ctx->mutex);

        if (client_queue_size(&ctx->req_queue) > 0) {
            ClientConnection connection;
            client_queue_pop(&ctx->req_queue, &connection);
            pthread_mutex_unlock(&ctx->mutex);

            http_worker_handle_connection(worker, connection);
            continue;
        }

        pthread_cond_wait(&ctx->cond, &ctx->mutex);

        pthread_mutex_unlock(&ctx->mutex);
    }
}

void http_worker_handle_connection(Worker* worker, ClientConnection connection)
{
    (void)worker;

    Client* client = http_client_new(connection);
    Request request;

    int res = http_client_next(client, &request);
    if (res != 0) {
        fprintf(stderr,
            "warning: failed to parse request. sending 400 Bad Request "
            "response\n");
        const char* res = "HTTP/1.1 400 Bad Request\r\n\r\n";
        ssize_t bytes_written = write(connection.file, res, strlen(res));
        if (bytes_written != (ssize_t)strlen(res)) {
            fprintf(stderr, "error: could not send 400 Bad Request response\n");
        }
        goto l0_return;
    }

    HttpCtx handler_ctx = {
        .client = &client->connection,
        .req = &request,
        .req_body = (char*)request.body,
        .res_headers = { 0 },
        .user_ctx = worker->ctx->server->user_ctx,
    };

    header_vec_construct(&handler_ctx.res_headers);

    bool been_handled = false;

    for (size_t i = 0; i < worker->ctx->server->handlers.size; ++i) {
        Handler* handler = &worker->ctx->server->handlers.data[i];
        if (handler->method != request.method)
            continue;
        if (strcmp(handler->path, request.path) != 0)
            continue;
        handler->handler(&handler_ctx);
        been_handled = true;
        break;
    }

    if (!been_handled && worker->ctx->server->not_found_handler != NULL) {
        worker->ctx->server->not_found_handler(&handler_ctx);
    }

    header_vec_destroy(&handler_ctx.res_headers);
    http_request_destroy(&request);
l0_return:
    close(client->connection.file);
    http_client_free(client);
}
