#include "../controllers.h"
#include "../http_server.h"
#include "../models_json.h"
#include "../str_util.h"
#include <string.h>

void route_post_sessions_login(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* body_str = http_ctx_req_body(ctx);

    JsonValue* body_json = json_parse(body_str, strlen(body_str));

    AuthLoginReq req;
    int parse_res = auth_login_req_from_json(&req, body_json);
    json_free(body_json);

    if (parse_res != 0) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        goto l0_return;
    }
    if (strlen(req.email) == 0 || strlen(req.password) > MAX_HASH_INPUT_LEN) {

        RESPOND_BAD_REQUEST(ctx, "bad request");
        goto l0_return;
    }

    User user;
    DbRes db_res = db_user_from_email(cx->db, &user, req.email);
    if (db_res == DbRes_NotFound) {
        RESPOND_BAD_REQUEST(ctx, "user with email not found");
        goto l0_return;
    } else if (db_res == DbRes_Error) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    if (!str_hash_equal(user.password_hash, req.password)) {
        RESPOND_BAD_REQUEST(ctx, "wrong password");
        goto l2_return;
    }

    sessions_remove(&cx->sessions, user.id);
    Session* session = sessions_add(&cx->sessions, user.id);

    RESPOND_JSON(ctx, 200, "{\"ok\":true,\"token\":\"%s\"}", session->token);
l2_return:
    user_destroy(&user);
l0_return:
    auth_login_req_destroy(&req);
}

void route_post_sessions_logout(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = header_session(ctx);
    if (!session) {
        RESPOND_JSON(ctx, 200, "{\"ok\":true}");
        return;
    }
    sessions_remove(&cx->sessions, session->user_id);
    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
}

void route_get_sessions_user(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    User user;
    DbRes db_res = db_user_from_id(cx->db, &user, session->user_id);
    if (db_res != DbRes_Ok) {
        RESPOND_BAD_REQUEST(ctx, "user not found");
        return;
    }

    char* user_json = user_to_json_string(&user);
    user_destroy(&user);

    RESPOND_JSON(ctx, 200, "{\"ok\":true,\"user\":%s}", user_json);
    free(user_json);
}

const Session* header_session(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    if (!http_ctx_req_headers_has(ctx, "Session-Token")) {
        return NULL;
    }
    const char* token = http_ctx_req_headers_get(ctx, "Session-Token");
    // session expiration should be handled here
    return sessions_find(&cx->sessions, token);
}

// Returns NULL AND responds if no valid session is found.
const Session* middleware_session(HttpCtx* ctx)
{
    const Session* session = header_session(ctx);
    if (!session) {
        RESPOND_JSON(ctx, 400, "{\"ok\":false,\"msg\":\"unauthorized\"}");
        return NULL;
    }
    return session;
}

void session_construct(Session* session, int64_t user_id)
{
    char* token = str_random(64);
    size_t token_hash = str_fast_hash(token);
    *session = (Session) { user_id, token, token_hash };
}

void session_destroy(Session* session)
{
    free(session->token);
    *session = (Session) {
        .user_id = 0,
        .token = NULL,
        .token_hash = 0,
    };
}

void sessions_remove(SessionVec* vec, int64_t user_id)
{
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].user_id == user_id) {
            session_destroy(&vec->data[i]);
        }
    }
}

Session* sessions_add(SessionVec* vec, int64_t user_id)
{
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].user_id == 0) {
            session_construct(&vec->data[i], user_id);
            return &vec->data[i];
        }
    }
    Session session;
    session_construct(&session, user_id);
    session_vec_push(vec, session);
    return &vec->data[vec->size - 1];
}

const Session* sessions_find(SessionVec* vec, const char* token)
{
    size_t token_hash = str_fast_hash(token);
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].token_hash == token_hash) {
            return &vec->data[i];
        }
    }
    return NULL;
}
