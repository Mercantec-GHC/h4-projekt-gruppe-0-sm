#include "session.h"
#include "str_util.h"
#include <stdlib.h>

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
