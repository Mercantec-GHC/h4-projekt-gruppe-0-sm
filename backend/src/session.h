#pragma once

#include <stdint.h>
#include "collection.h"

typedef struct {
    int64_t user_id;
} Session;

DEFINE_VEC(Session, SessionVec, session_vec, 16)
