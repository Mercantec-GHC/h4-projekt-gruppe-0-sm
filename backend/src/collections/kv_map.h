#pragma once

#include "collection.h"

#define DEFINE_KV_MAP(KEY, VALUE, MAP_TYPE, FN_PREFIX)                         \
    typedef KEY MAP_TYPE##Key;                                                 \
    typedef VALUE MAP_TYPE##Value;                                             \
    typedef struct {                                                           \
        MAP_TYPE##Key key;                                                     \
        MAP_TYPE##Value value;                                                 \
    } MAP_TYPE_Entry;                                                          \
                                                                               \
    DEFINE_VEC(MAP_TYPE_Entry, MAP_TYPE, FN_PREFIX##_entry_vec)                \
                                                                               \
    MAYBE_UNUSED static inline int FN_PREFIX##_construct(MAP_TYPE* map)        \
    {                                                                          \
        return FN_PREFIX##_entry_vec_construct(map);                           \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline void FN_PREFIX##_destroy(MAP_TYPE* map)         \
    {                                                                          \
        FN_PREFIX##_entry_vec_destroy(map);                                    \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline size_t FN_PREFIX##_internal_insert_idx(         \
        const MAP_TYPE* map, size_t begin, size_t end, MAP_TYPE##Key key)      \
    {                                                                          \
        if (begin == end) {                                                    \
            return begin;                                                      \
        }                                                                      \
        size_t middle = (end - begin) / 2 + begin;                             \
        if (key < map->data[middle].key) {                                     \
            return FN_PREFIX##_internal_insert_idx(map, begin, middle, key);   \
        } else if (key > map->data[middle].key) {                              \
            return FN_PREFIX##_internal_insert_idx(map, middle + 1, end, key); \
        } else {                                                               \
            return middle;                                                     \
        }                                                                      \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline int FN_PREFIX##_set(                            \
        MAP_TYPE* map, MAP_TYPE##Key key, MAP_TYPE##Value value)               \
    {                                                                          \
        size_t idx = FN_PREFIX##_internal_insert_idx(map, 0, map->size, key);  \
        if (idx >= map->size) {                                                \
            int push_res = FN_PREFIX##_entry_vec_push(                         \
                map, (MAP_TYPE_Entry) { key, value });                         \
            if (push_res != 0)                                                 \
                return -1;                                                     \
            return 0;                                                          \
        }                                                                      \
        if (map->data[idx].key == key) {                                       \
            map->data[idx].value = value;                                      \
        }                                                                      \
        int push_res                                                           \
            = FN_PREFIX##_entry_vec_push(map, map->data[map->size - 1]);       \
        if (push_res != 0)                                                     \
            return -1;                                                         \
        for (size_t i = idx; i < map->size - 1; ++i) {                         \
            map->data[i + 1] = map->data[i];                                   \
        }                                                                      \
        map->data[idx] = (MAP_TYPE_Entry) { key, value };                      \
        return 0;                                                              \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline MAP_TYPE_Entry* FN_PREFIX##_internal_find(      \
        MAP_TYPE* map, size_t begin, size_t end, MAP_TYPE##Key key)            \
    {                                                                          \
        if (begin == end) {                                                    \
            return NULL;                                                       \
        }                                                                      \
        size_t middle = (end - begin) / 2 + begin;                             \
        if (key < map->data[middle].key) {                                     \
            return FN_PREFIX##_internal_find(map, begin, middle, key);         \
        } else if (key > map->data[middle].key) {                              \
            return FN_PREFIX##_internal_find(map, middle + 1, end, key);       \
        } else {                                                               \
            return &map->data[middle];                                         \
        }                                                                      \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline MAP_TYPE##Value* FN_PREFIX##_get(               \
        MAP_TYPE* map, MAP_TYPE##Key key)                                      \
    {                                                                          \
        MAP_TYPE_Entry* found                                                  \
            = FN_PREFIX##_internal_find(map, 0, map->size, key);               \
        if (!found)                                                            \
            return NULL;                                                       \
        return &found->value;                                                  \
    }                                                                          \
                                                                               \
    MAYBE_UNUSED static inline const MAP_TYPE##Value* FN_PREFIX##_get_const(   \
        const MAP_TYPE* map, MAP_TYPE##Key key)                                \
    {                                                                          \
        /*                                                                     \
           WARNING: Casting away const !!                                      \
           This is okay, because we know '_internal_find' doesn't              \
           mutate.                                                             \
        */                                                                     \
        MAP_TYPE* not_const_map = (MAP_TYPE*)map;                              \
                                                                               \
        MAP_TYPE_Entry* found                                                  \
            = FN_PREFIX##_internal_find(not_const_map, 0, map->size, key);     \
        if (!found)                                                            \
            return NULL;                                                       \
        return &found->value;                                                  \
    }

#ifdef RUN_TESTS
#include "../util/panic.h"

DEFINE_KV_MAP(int, int, IntMap, int_map)

static inline void test_collections_kv_map(void)
{
    IntMap map;
    int_map_construct(&map);

    int_map_set(&map, 1, 10);
    int_map_set(&map, 3, 30);
    int_map_set(&map, 5, 50);

    int data[][2] = {
        { 0, 0 },
        { 1, 0 },
        { 2, 1 },
        { 3, 1 },
        { 4, 2 },
        { 5, 2 },
        { 6, 3 },
    };

    for (size_t i = 0; i < sizeof(data) / sizeof(data[0]); ++i) {
        int idx
            = (int)int_map_internal_insert_idx(&map, 0, map.size, data[i][0]);
        if (idx != data[i][1]) {
            PANIC("wrong insert index, expected %d, got %d", data[i][1], idx);
        }
    }

    int* val = int_map_get(&map, 3);
    if (!val || *val != 30) {
        PANIC("failed to find value");
    }

    val = int_map_get(&map, 4);
    if (val != NULL) {
        PANIC("found wrong value");
    }

    const int* const_val = int_map_get_const(&map, 5);
    if (!const_val || *const_val != 50) {
        PANIC("failed to find value");
    }

    int_map_destroy(&map);
}
#endif
