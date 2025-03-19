#pragma once

#include <stdio.h>
#include <stdlib.h>

#define PANIC(...)                                                             \
    (fputs("\x1b[1;31mpanic\x1b[97m: ", stderr),                               \
        fprintf(stderr, __VA_ARGS__),                                          \
        fprintf(stderr,                                                        \
            "\x1b[0m\n\tin %s:%d\n\tat %s:%d\n",                               \
            __func__,                                                          \
            __LINE__,                                                          \
            __FILE__,                                                          \
            __LINE__),                                                         \
        exit(1),                                                               \
        (void)0)

__attribute__((unused)) static inline void ___panic_h_include_user(void)
{
    PANIC("");
}
