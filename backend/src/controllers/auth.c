#include "../controllers.h"
#include "../http_server.h"
#include "../models_json.h"
#include "../str_util.h"
#include <string.h>

void route_post_auth_login(HttpCtx* ctx)
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
    if (strlen(req.email) == 0
        || strlen(req.password) > MAX_HASH_INPUT_LEN) {

        RESPOND_BAD_REQUEST(ctx, "bad request");
        goto l0_return;
    }

    User user;
    DbRes db_res = db_user_from_email(cx->db, &user, req.email);
    if (db_res == DbRes_NotFound) {
        RESPOND_BAD_REQUEST(ctx, "user with email not found");
        goto l0_return;
    }
    else if (db_res == DbRes_Error) {
        RESPOND_SERVER_ERROR(ctx);
        goto l0_return;
    }

    if (!str_hash_equal(user.password_hash, req.password)) {
        RESPOND_BAD_REQUEST(ctx, "wrong password");
        goto l2_return;
    }

    session_vec_push(&cx->sessions, (Session) {.user_id = user.id});

    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
l2_return:
    user_destroy(&user);
l0_return:
    auth_login_req_destroy(&req);
}
