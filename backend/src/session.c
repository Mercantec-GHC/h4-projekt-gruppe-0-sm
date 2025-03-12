#include "session.h"
#include <stdlib.h>

void session_destroy(Session* session)
{
    free(session->token);
}

void session_vec_remove_user_id(SessionVec* vec, int64_t user_id)
{
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].user_id == user_id) {
            session_destroy(&vec->data[i]);
            vec->data[i] = (Session) { 0, NULL };
        }
    }
}

void session_vec_add(SessionVec* vec, int64_t user_id, char* token)
{
    for (size_t i = 0; i < vec->size; ++i) {
        if (vec->data[i].user_id == 0) {
            vec->data[i] = (Session) { user_id, token };
            return;
        }
    }
    session_vec_push(vec, (Session) { user_id, token });
}
