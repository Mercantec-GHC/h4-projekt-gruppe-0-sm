#pragma once

#include "collection.h"
#include <stdint.h>

typedef struct {
    int64_t user_id;
    char* token;
} Session;

void session_destroy(Session* session);

DEFINE_VEC(Session, SessionVec, session_vec, 16)

void session_vec_remove_user_id(SessionVec* vec, int64_t user_id);
void session_vec_add(SessionVec* vec, int64_t user_id, char* token);
