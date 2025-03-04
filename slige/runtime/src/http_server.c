#include "http_server.h"
#include <netinet/in.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <threads.h>
#include <unistd.h>

typedef struct sockaddr SockAddr;
typedef struct sockaddr_in AddrIn;


struct HttpServer {
    int server_fd;
    AddrIn server_addr;
    thrd_t* worker_threads;
};

HttpServer* http_server_new(HttpServerOpts opts)
{

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd == -1) {
        fprintf(stderr, "error: could not initialize socket\n");
        return NULL;
    }

    AddrIn server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(opts.port);

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

    thrd_t* worker_threads = malloc(sizeof(thrd_t) * opts.worker_threads);
    for (size_t i = 0; i <  opts.worker_threads; ++i) {
        // worker_threads[i] = thrd_create(thrd_t *thr, thrd_start_t func, void *arg)
    }

    HttpServer* server = malloc(sizeof(HttpServer));
    *server = (HttpServer) {
        server_fd,
        server_addr,
    };

    return server;
}

void http_server_free(HttpServer* server)
{
    close(server->server_fd);
    free(server);
}

int http_server_listen(HttpServer* server)
{
    while (true) {
        AddrIn client_addr;
        socklen_t client_addr_size = sizeof(client_addr);

        int res = accept(
            server->server_fd, (SockAddr*)&client_addr, &client_addr_size);
        if (res == -1) {
            fprintf(stderr, "error: could not accept\n");
            return -1;
        }

    }
}
