#include "../http/http.h"
#include "../models/models_json.h"
#include "../util/str.h"
#include "controllers.h"
#include <string.h>

void route_post_users_register(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);

    const char* body_str = http_ctx_req_body(ctx);

    JsonValue* body_json = json_parse(body_str, strlen(body_str));

    UsersRegisterReq req;
    if (users_register_req_from_json(&req, body_json) != 0) {
        RESPOND_BAD_REQUEST(ctx, "invalid json");
        json_free(body_json);
        return;
    }
    json_free(body_json);

    if (strlen(req.name) == 0 || strlen(req.email) == 0
        || strlen(req.password) > MAX_HASH_INPUT_LEN) {
        RESPOND_BAD_REQUEST(ctx, "bad request");
        users_register_req_destroy(&req);
        return;
    }

    bool email_used;
    if (db_user_with_email_exists(cx->db, &email_used, req.email) != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        users_register_req_destroy(&req);
        return;
    }
    if (email_used) {
        RESPOND_BAD_REQUEST(ctx, "email in use");
        users_register_req_destroy(&req);
        return;
    }

    char* password_hash = str_hash(req.password);

    if (db_user_insert(cx->db,
            &(User) {
                .id = 0,
                .name = req.name,
                .email = req.email,
                .password_hash = password_hash,
                .balance_dkk_cent = 0,
            })
        != DbRes_Ok) {

        RESPOND_SERVER_ERROR(ctx);
        free(password_hash);
        users_register_req_destroy(&req);
        return;
    }
    free(password_hash);
    users_register_req_destroy(&req);
    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
}

void route_post_users_balance_add(HttpCtx* ctx)
{
    Cx* cx = http_ctx_user_ctx(ctx);
    const Session* session = middleware_session(ctx);
    if (!session)
        return;

    User user;
    if (db_user_with_id(cx->db, &user, session->user_id) != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        return;
    }

    user.balance_dkk_cent += 10000;

    DbRes db_res = db_user_update(cx->db, &user);
    user_destroy(&user);
    if (db_res != DbRes_Ok) {
        RESPOND_SERVER_ERROR(ctx);
        return;
    }

    RESPOND_JSON(ctx, 200, "{\"ok\":true}");
}
