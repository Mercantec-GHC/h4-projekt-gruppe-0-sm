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

MAKEFLAGS += -j $(shell nproc)

C_FLAGS = \
	-std=c17 \
	-Wall -Wextra -Wpedantic -Wconversion \
	-pedantic -pedantic-errors \
	-Wno-unused-parameter -Wno-format-zero-length \

L_FLAGS = -lm -pthread $(shell pkg-config sqlite3 openssl --libs)
C_FLAGS += $(shell pkg-config sqlite3 openssl --cflags)

F_FLAGS =
OPTIMIZATION =

RELEASE=0

ifeq ($(RELEASE),1)
	C_FLAGS += -Werror
	F_FLAGS += -flto=auto
	OPTIMIZATION += -O3
else
	C_FLAGS += -g
	F_FLAGS += -fsanitize=address,undefined,leak
	OPTIMIZATION += -Og
endif


ifeq ($(INCLUDE_TESTS),1)
	C_FLAGS += -DINCLUDE_TESTS
endif

PUBLIC_DIR_PATH=$(shell readlink -f ./public)
C_FLAGS += -DPUBLIC_DIR_PATH='"$(PUBLIC_DIR_PATH)"'

DB_FILEPATH=database.db
C_FLAGS += -DDB_FILEPATH='"$(DB_FILEPATH)"'

HEADERS = $(shell find src/ -name *.h)
C_FILES = $(shell find src/ -name *.c)
O_FILES = $(patsubst src/%.c,build/%.o,$(C_FILES))

CC = gcc

TARGET=server

all: build/$(TARGET)

build/$(TARGET): $(O_FILES)
	$(CC) -o $@ $^ $(F_FLAGS) $(OPTIMIZATION) $(L_FLAGS)

build/%.o: src/%.c $(HEADERS)
	@mkdir -p $(dir $@)
	$(CC) $< -c -o $@ $(C_FLAGS) $(OPTIMIZATION) $(F_FLAGS)

clean:
	rm -rf build/

drop_database:
	rm -rf $(DB_FILEPATH) && sqlite3 $(DB_FILEPATH) < prepare.sql

