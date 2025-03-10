
# HTTP server i C

Jeg vil her forsøge at beskrive definerende problemer og væsentlige designdetaljer i vores implementering.

## Showcase 

### Application server

Vi tog udgangspunkt i NodeJS' ExpressJS i designet af HTTP-serverens API.

Eksempel på ExpressJS:
```ts
const app = express();

app.get("/products/all", (req, res) => {
    res.json({
        ok: true,
        products: [
            { id: 1, name: "Letmælk", price: 1200 },
            { id: 2, name: "Smør", price: 2400 },
        ],
    })
});

app.listen(8080);
```

Eksempel på vores HTTP server API:
```c
int main(void)
{
    HttpServer* server = http_server_new((HttpServerOpts){
        .port = 8080,
        .workers = 8, /* 8 worker threads*/
    });

    if (!server) {
        fprintf(stderr, "could not start server\n");
    }

    http_server_get(server, "/products/all", get_products_all_handler);

    http_server_listen(server);

    http_server_free(server);
}

void get_products_all_handler(HttpCtx* ctx)
{
    RESPOND_JSON(ctx, 200,
        "{"
            "\"ok\":true,"
            "\"products\":["
                "{\"id\":1,\"name\":\"Letmælk\",\"price\":1200},"
                "{\"id\":2,\"name\":\"Smør\",\"price\":2400}"
            "]"
        "}");
}
```

### Request body

Vi har lavet værktøjer til at håndtere request body på POST-requests. Her sammenlignes det med ExpressJS.

Eksempel i ExpressJS:
```ts
type LoginReq = { username: string, password: string };

app.post("/login", (req, res) => {
    const reqBody = req.body as LoginReq;

    console.log(`username: ${reqBody.username}, password: ${reqBody.password}`);
    // ...
});
```

Eksempel med vores implementation:
```c
typedef struct {
    char* username;
    char* password;
} LoginReq;

// Defined elsewhere.
void login_req_destroy(LoginReq* model);
int login_req_from_json(LoginReq* model, const JsonValue* json);

void post_login(HttpCtx* ctx)
{
    const char* body_string = http_ctx_req_body(ctx);
    JsonValue* body_json = json_parse(body_string, strlen(body_string));

    if (!body_json) {
        RESPOND_BAD_REQUEST("malformed body");
        return;
    }

    LoginReq req_body;
    int parse_res = login_req_from_json(&req_body, body_json);
    free(body_json);

    if (parse_res != 0) {
        RESPOND_BAD_REQUEST("malformed body");
        return;
    }

    printf(
        "username: %s, password: %s\n",
        req_body.username,
        req_body.password);

    // ...
    loing_req_destroy(&req_body);
}
```

JSON-parseren er bespoke.

### HTTP headers

Vi har funktionalitet, så man både kan undersøge request headers og sætte response headers.

#### Request headers

```c
void get_is_authorized(HttpCtx* ctx)
{
    if (!http_ctx_req_headers_has(ctx, "Auth-Token")) {
        RESPOND_JSON(ctx, 200, "{\"authorized\":false}");
        return;
    }
    char* token = http_ctx_req_headers_get(ctx, "Auth-Token");

    if (strcmp(token, "...") != 0) {
        // ...
    }
    // ...
}
```

#### Response headers

```c
void post_login(HttpCtx* ctx)
{
    // ...
    http_ctx_res_headers_set("Auth-Token", "...");
    // ...
}
```

### Referencer

- HTTP-serverens offentlige API er defineret i [src/http_server.h](../backend/src/http_server.h).
- JSON-parserens offentlige API er defineret i [src/json.h](../backend/src/json.h).
- Eksempler på `*_from_json`-funktioner kan findes i [src/models.c](../backend/src/models.c).
- NodeJS NPM-pakken 'express', kan findes på [npmjs.com](https://www.npmjs.com/package/express).

## HTTP-server med Linux

### API'en og hoveddatatypen

HTTP-serveren er defineret med en offentlig API, defineret i [src/http_server.h](../backend/src/http_server.h). Implementationen er defineret i [src/http_server_internal.h](../backend/src/http_server_internal.h) og [src/http_server..c](../backend/src/http_server.c).

Den offentlige API er defineret sådan:
```c
// src/http_server.h:7
typedef struct HttpServer HttpServer;

// ...

/// On ok, HttpServer
/// On error, returns NULL and prints.
HttpServer* http_server_new(HttpServerOpts opts);
void http_server_free(HttpServer* server);
/// On ok, returns 0.
/// On error, returns -1 and prints;
int http_server_listen(HttpServer* server);

// ...
```

Hoveddatatypen `HttpServer` er opaque. I implementationen er den defineret sådan:
```c
// src/http_server_internal.h:89
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
```

`HttpServer`-typen bliver konstrueret med følgende funktion:
```c
// src/http_server.c:16
HttpServer* http_server_new(HttpServerOpts opts)
{

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    // ...
    int res = bind(server_fd, (SockAddr*)&server_addr, sizeof(server_addr));
    // ...
    res = listen(server_fd, 16);
    // ...
    HttpServer* server = malloc(sizeof(HttpServer));
    *server = (HttpServer) {
        .file = server_fd,
        // ...
        .workers = malloc(sizeof(Worker) * opts.workers_amount),
        .workers_size = opts.workers_amount,
        // ...
    };
    // ...
    for (size_t i = 0; i < opts.workers_amount; ++i) {
        worker_construct(&server->workers[i], &server->ctx);
    }
    // ...
    return server;
}
```

Error-håndtering og diverse konstruktion er udeladt.

Funktionen benytter Linux-funktionerne `socket`, `bind` og `listen` til at lave et server-socket, binde den til en port og sætte socket'et til at lytte på request.

Funktionen konstruerer også et array af workers.

### Request-kø

Når en klient opretter forbindelse til serveren, tilføjer vi klienten til en klientkø eller request-kø (`req_queue`). Denne ligger på det interne server struct `Cx`.

```c
// src/http_server_internal.h:24
typedef struct {
    const HttpServer* server;
    pthread_mutex_t mutex;
    pthread_cond_t cond;
    ReqQueue req_queue;
} Cx;
```

En HTTP-server har én enkelt instans af dette struct. En pointer til denne instans bliver passed rundt mellem alle serverens worker-threads. Derfor skal struct'et understøtte multithreading, som er derfor den har en mutex.

Måden workers'ne venter på nye requests/klienter, er ved at lytte på condition-variablen `cond`.

`ReqQueue`-typen er en dynamisk array/vector, som er defineret med `DEFINE_VEC`-makro'en. Se [src/http_server_internal.h](../backend/src/http_server_internal.h) og [src/collection.h](../backend/src/collection.h)

### Server listen

For at kunne få request, skal serveren sættes til at lytte efter requests. Dette gøres med `http_server_listen`-funktionen, som er defineret sådan:

```c
// src/http_server.c:77
int http_server_listen(HttpServer* server)
{
    Cx* ctx = &server->ctx;

    while (true) {
        SockAddrIn client_addr;
        socklen_t addr_size = sizeof(client_addr);

        int res = accept(server->file, (SockAddr*)&client_addr, &addr_size);
        // ...

        Client req = { .file = res, client_addr };
        pthread_mutex_lock(&ctx->mutex);

        res = request_queue_push(&ctx->req_queue, req);
        /// ...
        pthread_mutex_unlock(&ctx->mutex);
        pthread_cond_signal(&ctx->cond);
    }
}
```

For det første køres dette kode i en uendelig løkke (`while (true) {`), for at `accept` alle forbindelser. `accept`-funktionen pauser afvikling til en ny client forbinder.

For det andet benytter funktionen Linux-funktionen `accept`, som henter nye forbindelser til et socket.

For det tredje laver funktionen synkronisering, når den tilføjer til request-køen. Efter den har tilføjet til køen, notifyer den én worker, som så vil håndtere klienten. Dette gøres med `pthread_cond_signal`, som vækker en enkelt worker, ud af alle workers som lytter på `cond`-variablen.

### Worker listen

På samme måde som serveren lytter på klient-forbindelser udefra, lytter workers til klient-forbindelser/requests på request-køen. Denne gøres med `worker_listen`-funktion, som er defineret sådan:

```c
// src/http_server.c:237
static inline void worker_listen(Worker* worker)
{
    Cx* ctx = worker->ctx;
    while (true) {
        pthread_testcancel();

        pthread_mutex_lock(&ctx->mutex);

        // If there is a request in the queue, handle the request
        // and look again.
        if (request_queue_size(&ctx->req_queue) > 0) {
            // Pop a client from the queue.
            Client req;
            request_queue_pop(&ctx->req_queue, &req);
            pthread_mutex_unlock(&ctx->mutex);

            worker_handle_request(worker, &req);
            continue;
        }

        // If there's no request in the queue, sleep until notified.
        //
        // This function equires mutex to be locked,
        // but will release mutex when waiting, RTFM.
        pthread_cond_wait(&ctx->cond, &ctx->mutex);

        pthread_mutex_unlock(&ctx->mutex);
    }
}
```

Her bruges condition-variablen til at vente på requests, hvis der ikke allerede er requests i køen.

### Referencer

- HTTP-serverens offentlige API er defineret i [src/http_server.h](../backend/src/http_server.h).
- HTTP-serverens implementation er defineret i [src/http_server_internal.h](../backend/src/http_server_internal.h) og [src/http_server.c](../backend/src/http_server.c).
- Vector-implementationen, dvs. `DEFINE_VEC`-makroen er defineret I [src/collection.h](../backend/src/collection.h).

## HTTP-parsing

For at kunne håndtere HTTP-request, skal serveren kunne parse requestene, der kommer ind. HTTP-requests sendes som strings og består hovedsagligt af 2 dele: header og body. Body'en er en string, som håndteres forskelligt afhængigt af headeren. Headeren er en liste af entries, hvor den første entry siger noget om request-type, -sti og HTTP-version. Efterfølgende entries i header-listen er key/value-par af 'header entries'.

### Header parsing

Når en worker får en klient-forbindelse, læser den en fast mængde bytes fra klienten. Denne mængde er nok til at læse hele headeren. Dette bliver gjort i [`worker_handle_request`-funktionen](../backend/src/http_server.c#L264-L282).

Når headeren er læst, bliver den parsed i [`parse_header`-funktionen](../backend/src/http_server.c#L344C19-L438). Denne funktion splitter requesten med newlines (`\r\n` defineret i HTTP-standarden) og pakker requesten ud i et [`Req`-struct](../backend/src/http_server_internal.h#L67-L79).

### JSON body-parsing

Hvis en klient sender en POST-request med en JSON-body, skal serveren kunne parse body'en. Dette gøres manuelt af HTTP-serverens brugerdefinerede request-handlers. Vi har implementeret en bespoke JSON-parser til dette formål.

### Referencer

- Implementeringen af header parsing er defineret i [src/http_server_internal.h](../backend/src/http_server_internal.h) og [src/http_server.c](../backend/src/http_server.c).
- JSON-parserens offentlige API er defineret i [src/json.h](../backend/src/json.h) og implementeringen er defineret i [src/json.c](../backend/src/json.c).

