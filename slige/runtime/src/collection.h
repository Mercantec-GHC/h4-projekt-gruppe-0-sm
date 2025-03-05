#pragma once

#include <stddef.h>
#include <stdlib.h>

#define DEFINE_VEC(TYPE, VEC_TYPE, FN_PREFIX, INITIAL_CAPACITY)                \
    typedef struct {                                                           \
        TYPE* data;                                                            \
        size_t capacity;                                                       \
        size_t size;                                                           \
    } VEC_TYPE;                                                                \
                                                                               \
    static inline int FN_PREFIX##_construct(VEC_TYPE* vec)                     \
    {                                                                          \
        const size_t capacity = INITIAL_CAPACITY;                              \
        TYPE* data = malloc(sizeof(TYPE) * capacity);                          \
        if (!data)                                                             \
            return -1;                                                         \
        *vec = (VEC_TYPE) { data, capacity, .size = 0 };                       \
        return 0;                                                              \
    }                                                                          \
                                                                               \
    static inline void FN_PREFIX##_destroy(VEC_TYPE* vec)                      \
    {                                                                          \
        free(vec->data);                                                       \
    }                                                                          \
                                                                               \
    static inline VEC_TYPE* FN_PREFIX##_new(void)                              \
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
    static inline void FN_PREFIX##_free(VEC_TYPE* vec)                         \
    {                                                                          \
        FN_PREFIX##_destroy(vec);                                              \
        free(vec);                                                             \
    }                                                                          \
                                                                               \
    static inline int FN_PREFIX##_push(VEC_TYPE* vec, TYPE value)              \
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
    static inline TYPE* FN_PREFIX##_at(VEC_TYPE* vec, size_t idx)              \
    {                                                                          \
        return &vec->data[idx];                                                \
    }                                                                          \
                                                                               \
    static inline const TYPE* FN_PREFIX##_at_const(                            \
        const VEC_TYPE* vec, size_t idx)                                       \
    {                                                                          \
        return &vec->data[idx];                                                \
    }                                                                          \
                                                                               \
    static inline TYPE FN_PREFIX##_get(const VEC_TYPE* vec, size_t idx)        \
    {                                                                          \
        return vec->data[idx];                                                 \
    }

#define DEFINE_STATIC_QUEUE(TYPE, QUEUE_TYPE, FN_PREFIX)                       \
    typedef struct {                                                           \
        TYPE* data;                                                            \
        size_t capacity;                                                       \
        size_t back;                                                           \
        size_t front;                                                          \
    } QUEUE_TYPE;                                                              \
                                                                               \
    static inline int FN_PREFIX##_construct(                                   \
        QUEUE_TYPE* queue, size_t capacity)                                    \
    {                                                                          \
        *queue = (QUEUE_TYPE) {                                                \
            .data = malloc(sizeof(TYPE) * capacity),                           \
            .capacity = capacity,                                              \
            .back = 0,                                                         \
            .front = 0,                                                        \
        };                                                                     \
        return 0;                                                              \
    }                                                                          \
                                                                               \
    static inline void FN_PREFIX##_destroy(QUEUE_TYPE* queue)                  \
    {                                                                          \
        free(queue->data);                                                     \
    }                                                                          \
                                                                               \
    static inline QUEUE_TYPE* FN_PREFIX##_new(size_t capacity)                 \
    {                                                                          \
        QUEUE_TYPE* queue = malloc(sizeof(QUEUE_TYPE));                        \
        if (!queue)                                                            \
            return NULL;                                                       \
        int res = FN_PREFIX##_construct(queue, capacity);                      \
        if (res != 0)                                                          \
            return NULL;                                                       \
        return queue;                                                          \
    }                                                                          \
                                                                               \
    static inline void FN_PREFIX##_free(QUEUE_TYPE* queue)                     \
    {                                                                          \
        FN_PREFIX##_destroy(queue);                                            \
        free(queue);                                                           \
    }                                                                          \
                                                                               \
    static inline int FN_PREFIX##_push(QUEUE_TYPE* queue, TYPE req)            \
    {                                                                          \
        size_t front = queue->front + 1;                                       \
        if (front >= queue->capacity) {                                        \
            front = 0;                                                         \
        }                                                                      \
        if (front == queue->back) {                                            \
            return -1;                                                         \
        }                                                                      \
        queue->data[queue->front] = req;                                       \
        queue->front = front;                                                  \
        return 0;                                                              \
    }                                                                          \
                                                                               \
    static inline size_t FN_PREFIX##_size(const QUEUE_TYPE* queue)             \
    {                                                                          \
        return queue->front >= queue->back                                     \
            ? queue->front - queue->back                                       \
            : (queue->capacity - queue->back) + queue->front;                  \
    }                                                                          \
                                                                               \
    static inline int FN_PREFIX##_pop(QUEUE_TYPE* queue, TYPE* req)            \
    {                                                                          \
        if (queue->back == queue->front) {                                     \
            return -1;                                                         \
        }                                                                      \
        *req = queue->data[queue->back];                                       \
        size_t back = queue->back + 1;                                         \
        if (back >= queue->capacity) {                                         \
            back = 0;                                                          \
        }                                                                      \
        queue->back = back;                                                    \
        return 0;                                                              \
    }
