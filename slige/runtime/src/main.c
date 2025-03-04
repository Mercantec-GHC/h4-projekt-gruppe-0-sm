#include "http_server.h"
#include <stdio.h>

int main(void)
{
    printf("hello world\n");

    HttpServer* server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .worker_threads = 8,
    });

    http_server_free(server);
}
