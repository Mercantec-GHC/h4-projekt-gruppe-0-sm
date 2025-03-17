#include "./http.h"
#include <stdlib.h>
#include <string.h>

typedef struct {
    StrSlice key;
    StrSlice value;
} Param;

DEFINE_VEC(Param, ParamVec, query_param_vec)

struct HttpQueryParams {
    ParamVec vec;
};

HttpQueryParams* http_parse_query_params(const char* query)
{
    HttpQueryParams* result = malloc(sizeof(HttpQueryParams));

    *result = (HttpQueryParams) {
        .vec = (ParamVec) { 0 },
    };
    query_param_vec_construct(&result->vec);

    StrSplitter params = str_splitter(query, strlen(query), "&");
    StrSlice param;
    while ((param = str_split_next(&params)).len != 0) {
        StrSplitter left_right = str_splitter(param.ptr, param.len, "=");
        StrSlice key = str_split_next(&left_right);
        StrSlice value = str_split_next(&left_right);

        query_param_vec_push(&result->vec, (Param) { key, value });
    }

    return result;
}

void http_query_params_free(HttpQueryParams* query_params)
{
    query_param_vec_destroy(&query_params->vec);
    free(query_params);
}

char* http_query_params_get(
    const HttpQueryParams* query_params, const char* key)
{
    size_t key_len = strlen(key);
    for (size_t i = 0; i < query_params->vec.size; ++i) {
        const Param* entry = &query_params->vec.data[i];
        if (key_len == entry->key.len && strcmp(key, entry->key.ptr)) {
            return str_slice_copy(&entry->value);
        }
    }
    return NULL;
}
