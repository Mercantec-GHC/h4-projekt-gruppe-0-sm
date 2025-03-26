#include <stdint.h>
#include <stdio.h>

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
