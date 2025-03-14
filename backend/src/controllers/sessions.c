#include "../http/http.h"
#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"
#include <string.h>

void route_post_sessions_login(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* body_str = http_ctx_req_body(ctx);

    JsonValue* body_json = json_parse(body_str, strlen(body_str));

    SessionsLoginReq req;
    int parse_res = sessions_login_req_from_json(&req, body_json);
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
    DbRes db_res = db_user_with_email(cx->db, &user, req.email);
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

    cx_sessions_remove(cx, user.id);
    Session* session = cx_sessions_add(cx, user.id);

    RESPOND_JSON(ctx, 200, "{\"ok\":true,\"token\":\"%s\"}", session->token);
l2_return:
    user_destroy(&user);
l0_return:
    sessions_login_req_destroy(&req);
}

void route_post_sessions_logout(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = header_session(ctx);
    if (!session) {
        RESPOND_JSON(ctx, 200, "{\"ok\":true}");
        return;
    }
    cx_sessions_remove(cx, session->user_id);
    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
}

void route_get_sessions_user(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    User user;
    DbRes db_res = db_user_with_id(cx->db, &user, session->user_id);
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
    return cx_sessions_find(cx, token);
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
