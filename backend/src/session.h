#pragma once

#include "collection.h"
#include <stdint.h>

typedef struct {
    int64_t user_id;
    char* token;
    size_t token_hash;
} Session;

void session_construct(Session* session, int64_t user_id);
void session_destroy(Session* session);

DEFINE_VEC(Session, SessionVec, session_vec, 16)

void sessions_remove(SessionVec* vec, int64_t user_id);
Session* sessions_add(SessionVec* vec, int64_t user_id);
const Session* sessions_find(SessionVec* vec, const char* token);
