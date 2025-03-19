#pragma once

#include "../util/attrs.h"
#include <stddef.h>
#include <stdlib.h>

#define DECLARE_VEC_TYPE(TYPE, VEC_TYPE, FN_PREFIX, FN_SPECIFIER)              \
    typedef TYPE VEC_TYPE##T;                                                  \
    typedef struct {                                                           \
        VEC_TYPE##T* data;                                                     \
        size_t capacity;                                                       \
        size_t size;                                                           \
    } VEC_TYPE;                                                                \
    FN_SPECIFIER int FN_PREFIX##_construct(VEC_TYPE* vec);                     \
    FN_SPECIFIER void FN_PREFIX##_destroy(VEC_TYPE* vec);                      \
    FN_SPECIFIER VEC_TYPE* FN_PREFIX##_new(void);                              \
    FN_SPECIFIER void FN_PREFIX##_free(VEC_TYPE* vec);                         \
    FN_SPECIFIER int FN_PREFIX##_push(VEC_TYPE* vec, VEC_TYPE##T value);       \
    FN_SPECIFIER VEC_TYPE##T* FN_PREFIX##_at(VEC_TYPE* vec, size_t idx);       \
    FN_SPECIFIER const VEC_TYPE##T* FN_PREFIX##_at_const(                      \
        const VEC_TYPE* vec, size_t idx);                                      \
    FN_SPECIFIER VEC_TYPE##T FN_PREFIX##_get(const VEC_TYPE* vec, size_t idx);

#define DEFINE_VEC_IMPL(TYPE, VEC_TYPE, FN_PREFIX, FN_SPECIFIER)               \
    FN_SPECIFIER int FN_PREFIX##_construct(VEC_TYPE* vec)                      \
    {                                                                          \
        const size_t capacity                                                  \
            = 8 / sizeof(VEC_TYPE##T) > 2 ? 8 / sizeof(VEC_TYPE##T) : 2;       \
        VEC_TYPE##T* data = malloc(sizeof(VEC_TYPE##T) * capacity);            \
        if (!data)                                                             \
            return -1;                                                         \
        *vec = (VEC_TYPE) { data, capacity, .size = 0 };                       \
        return 0;                                                              \
    }                                                                          \
                                                                               \
    FN_SPECIFIER void FN_PREFIX##_destroy(VEC_TYPE* vec)                       \
    {                                                                          \
        free(vec->data);                                                       \
    }                                                                          \
                                                                               \
    FN_SPECIFIER VEC_TYPE* FN_PREFIX##_new(void)                               \
    {                                                                          \
        VEC_TYPE* vec = malloc(sizeof(VEC_TYPE));                              \
        if (!vec)                                                              \
            return NULL;                                                       \
        int res = FN_PREFIX##_construct(vec);                                  \
        if (res != 0)                                                          \
            return NULL;                                                       \
        return vec;                                                            \
    }                                                                          \
                                                                               \
    FN_SPECIFIER void FN_PREFIX##_free(VEC_TYPE* vec)                          \
    {                                                                          \
        FN_PREFIX##_destroy(vec);                                              \
        free(vec);                                                             \
    }                                                                          \
                                                                               \
    FN_SPECIFIER int FN_PREFIX##_push(VEC_TYPE* vec, VEC_TYPE##T value)        \
    {                                                                          \
        if (vec->size + 1 > vec->capacity) {                                   \
            size_t new_capacity = vec->capacity * 2;                           \
            TYPE* new_data = realloc(vec->data, new_capacity * sizeof(TYPE));  \
            if (!new_data)                                                     \
                return -1;                                                     \
            vec->data = new_data;                                              \
            vec->capacity = new_capacity;                                      \
        }                                                                      \
        vec->data[vec->size] = value;                                          \
        vec->size += 1;                                                        \
        return 0;                                                              \
    }                                                                          \
                                                                               \
    FN_SPECIFIER VEC_TYPE##T* FN_PREFIX##_at(VEC_TYPE* vec, size_t idx)        \
    {                                                                          \
        return &vec->data[idx];                                                \
    }                                                                          \
                                                                               \
    FN_SPECIFIER const VEC_TYPE##T* FN_PREFIX##_at_const(                      \
        const VEC_TYPE* vec, size_t idx)                                       \
    {                                                                          \
        return &vec->data[idx];                                                \
    }                                                                          \
                                                                               \
    FN_SPECIFIER VEC_TYPE##T FN_PREFIX##_get(const VEC_TYPE* vec, size_t idx)  \
    {                                                                          \
        return vec->data[idx];                                                 \
    }

#define DEFINE_VEC(TYPE, VEC_TYPE, FN_PREFIX)                                  \
    DECLARE_VEC_TYPE(TYPE, VEC_TYPE, FN_PREFIX, MAYBE_UNUSED static inline)    \
    DEFINE_VEC_IMPL(TYPE, VEC_TYPE, FN_PREFIX, MAYBE_UNUSED static inline)
