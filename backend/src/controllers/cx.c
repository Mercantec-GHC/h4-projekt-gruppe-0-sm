#include "../util/str.h"
#include "controllers.h"
#include <pthread.h>

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

void cx_construct(Cx* cx, Db* db)
{
    *cx = (Cx) {
        .mutex = PTHREAD_MUTEX_INITIALIZER,
        .number = 1,
        .sessions = (SessionVec) { 0 },
        .db = db,
    };
    session_vec_construct(&cx->sessions);
}

void cx_destroy(Cx* cx)
{
    pthread_mutex_destroy(&cx->mutex);
    session_vec_destroy(&cx->sessions);
}

void cx_sessions_remove(Cx* cx, int64_t user_id)
{
    pthread_mutex_lock(&cx->mutex);

    SessionVec* vec = &cx->sessions;
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].user_id == user_id) {
            session_destroy(&vec->data[i]);
        }
    }

    pthread_mutex_unlock(&cx->mutex);
}

Session* cx_sessions_add(Cx* cx, int64_t user_id)
{
    Session* res;
    pthread_mutex_lock(&cx->mutex);

    SessionVec* vec = &cx->sessions;
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].user_id == 0) {
            session_construct(&vec->data[i], user_id);
            res = &vec->data[i];
            goto l0_return;
        }
    }
    Session session;
    session_construct(&session, user_id);
    session_vec_push(vec, session);

    res = &vec->data[vec->size - 1];

l0_return:
    pthread_mutex_unlock(&cx->mutex);
    return res;
}

const Session* cx_sessions_find(Cx* cx, const char* token)
{
    const Session* res;
    pthread_mutex_lock(&cx->mutex);

    SessionVec* vec = &cx->sessions;
    size_t token_hash = str_fast_hash(token);
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].token_hash == token_hash) {
            res = &vec->data[i];
            goto l0_return;
        }
    }
    res = NULL;

l0_return:
    pthread_mutex_unlock(&cx->mutex);
    return res;
}
