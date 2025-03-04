#include "http_server.h"
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>

HttpServer* server;

int main(void)
{
    printf("hello world\n");

    server = http_server_new((HttpServerOpts) {
        .port = 8080,
        .workers_amount = 8,
    });
    if (!server) {
        return -1;
    }

    printf("listening at http://127.0.0.1:8080/\n");
    http_server_listen(server);

    http_server_free(server);
}
