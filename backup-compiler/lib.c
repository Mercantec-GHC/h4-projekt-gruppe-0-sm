#include <stdint.h>
#include <stdio.h>

typedef struct {
    int64_t length;
    char data[];
} Str;

int64_t notice(void)
{
    printf("NOTICE!\n");
    return 0;
}

int64_t print_int(int64_t value)
{
    printf("%ld\n", value);
    return 0;
}

int64_t println(const Str* value)
{
    printf("%.*s\n", (int)value->length, value->data);
    return 0;
}
