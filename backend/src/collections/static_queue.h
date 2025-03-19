#pragma once

#include "../utils/attrs.h"
#include <stddef.h>
#include <stdlib.h>

#define DEFINE_STATIC_QUEUE(TYPE, QUEUE_TYPE, FN_PREFIX)                       \
    typedef struct {                                                           \
        TYPE* data;                                                            \
        size_t capacity;                                                       \
        size_t back;                                                           \
        size_t front;                                                          \
    } QUEUE_TYPE;                                                              \
                                                                               \
    MAYBE_UNUSED static inline int FN_PREFIX##_construct(                      \
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
    MAYBE_UNUSED static inline void FN_PREFIX##_destroy(QUEUE_TYPE* queue)     \
    {                                                                          \
        free(queue->data);                                                     \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline QUEUE_TYPE* FN_PREFIX##_new(size_t capacity)    \
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
    MAYBE_UNUSED static inline void FN_PREFIX##_free(QUEUE_TYPE* queue)        \
    {                                                                          \
        FN_PREFIX##_destroy(queue);                                            \
        free(queue);                                                           \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline int FN_PREFIX##_push(                           \
        QUEUE_TYPE* queue, TYPE req)                                           \
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
    MAYBE_UNUSED static inline size_t FN_PREFIX##_size(                        \
        const QUEUE_TYPE* queue)                                               \
    {                                                                          \
        return queue->front >= queue->back                                     \
            ? queue->front - queue->back                                       \
            : (queue->capacity - queue->back) + queue->front;                  \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline int FN_PREFIX##_pop(                            \
        QUEUE_TYPE* queue, TYPE* req)                                          \
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
