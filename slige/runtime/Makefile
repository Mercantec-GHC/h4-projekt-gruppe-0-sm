# Slige 2 Runtime
# 
# To build for debug:
# $ make
#
# To build for release:
# $ make RELEASE=1
#
# NOTICE that `RELEASE=1` is __after__ `make`
#

C_FLAGS = \
	-std=c17 \
	-Wall -Wextra -Wpedantic -Wconversion \
	-pedantic -pedantic-errors \

L_FLAGS = -lm -pthread

F_FLAGS =
OPTIMIZATION =

RELEASE=0

ifeq ($(RELEASE),1)
	C_FLAGS += -Werror
	F_FLAGS += -flto=auto
	OPTIMIZATION += -O3
else
	C_FLAGS += -g
	F_FLAGS += -fsanitize=address,undefined
	OPTIMIZATION += -Og
endif

HEADERS = $(shell find src/ -name *.h)
C_FILES = $(shell find src/ -name *.c)
O_FILES = $(patsubst src/%.c,build/%.o,$(C_FILES))

CC = gcc

all: build_dir runtime

runtime: $(O_FILES)
	$(CC) -o build/$@ $^ $(F_FLAGS) $(OPTIMIZATION) $(L_FLAGS)

build/%.o: src/%.c $(HEADERS)
	$(CC) $< -c -o $@ $(C_FLAGS) $(OPTIMIZATION) $(F_FLAGS)

build_dir:
	mkdir -p build/

clean:
	rm -rf build/
