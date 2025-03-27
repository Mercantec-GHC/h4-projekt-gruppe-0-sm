
all: out

out: entry.o out.o lib.o
	gcc $^ -o $@ -no-pie

%.o: %.c
	gcc -c -o $@ -std=c17 -Wall -Wextra -Wpedantic -pedantic -pedantic-errors $^

%.o: %.nasm
	nasm -f elf64 $< -o $@

out.nasm: program.sbl
	deno run --allow-read --allow-write --check main.ts $< $@

clean:
	rm -rf out.asm out.o lib.o entry.o out

