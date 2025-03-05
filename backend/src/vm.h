#ifndef VM_H
#define VM_H

#include <stdint.h>
#include <stdio.h>

/// Instruction operations.
///
/// These definitions dictate how instructions should be decoded.
///
/// `%ireg` is an int or pointer register.
/// `%i32` is a 32-bit immediate int value.
/// `%i64` is a 64-bit immediate int value.
///
/// `%freg` is a float register.
/// `%f64` is a 64-bit immediate float value.
///
/// The instruction header is 4 bytes. Usually instruction headers are encoding
/// like this:
/// ```
/// XX = 1 byte
///
/// XX XX XX XX
/// ^^ ^^ ^^ ^^ - Op
/// |  |  |
/// |  |  ++-- destination register
/// |  |
/// |  ++-- right/second operand register
/// |
/// ++--- left/first operand register
/// ```
///
/// Then immediate values are appended after the header.
///
/// Immediates are little endian. This means that the smallest byte has the
/// smallest address. Example: take a value like `4660`, convert it to hex
/// `0x1234`, split up in bytes `12 34`, put it into an array `[12, 34]`. This
/// is big endian ie. WRONG. Put the bytes `12 34` into the array in reverse
/// order `[34, 12]`. This is little endiang ie. CORRECT.
///
typedef enum {
    Op_Nop,
    Op_Halt,
    Op_Builtin,

    Op_Call,
    Op_CallI,
    Op_Ret,
    Op_Alloca,

    Op_Jmp,
    Op_Jnz,
    Op_Jz,

    Op_Load8,
    Op_LoadI8,
    Op_LoadA8,
    Op_Load16,
    Op_LoadI16,
    Op_LoadA16,
    Op_Load32,
    Op_LoadI32,
    Op_LoadA32,
    Op_Load64,
    Op_LoadI64,
    Op_LoadA64,
    Op_LoadF,
    Op_LoadIF,
    Op_LoadAF,

    Op_Store8,
    Op_StoreA8,
    Op_Store16,
    Op_StoreA16,
    Op_Store32,
    Op_StoreA32,
    Op_Store64,
    Op_StoreA64,
    Op_StoreF,
    Op_StoreAF,

    Op_LoadImm32,
    Op_LoadImm64,
    Op_LoadImmF,
    Op_LoadSb,
    Op_LoadSp,

    Op_MovII,
    Op_MovIF,
    Op_MovFI,
    Op_MovFF,

    Op_Push,
    Op_Pop,

    Op_PushF,
    Op_PopF,

    Op_Eq,
    Op_Ne,
    Op_Lt,
    Op_Gt,
    Op_Lte,
    Op_Gte,
    Op_And,
    Op_Or,
    Op_Xor,
    Op_Add,
    Op_Sub,
    Op_Mul,
    Op_Div,
    Op_Rem,
    Op_IMul,
    Op_IDiv,

    Op_EqI,
    Op_NeI,
    Op_LtI,
    Op_GtI,
    Op_LteI,
    Op_GteI,
    Op_AndI,
    Op_OrI,
    Op_XorI,
    Op_AddI,
    Op_SubI,
    Op_RSubI,
    Op_MulI,
    Op_DivI,
    Op_RemI,
    Op_IMulI,
    Op_IDivI,

    Op_EqF,
    Op_NeF,
    Op_LtF,
    Op_GtF,
    Op_LteF,
    Op_GteF,
    Op_AddF,
    Op_SubF,
    Op_MulF,
    Op_DivF,

    Op_EqFI,
    Op_NeFI,
    Op_LtFI,
    Op_GtFI,
    Op_LteFI,
    Op_GteFI,
    Op_AddFI,
    Op_SubFI,
    Op_RSubFI,
    Op_MulFI,
    Op_DivFI,
} Op;

typedef enum {
    Builtin_Alloc,
    Builtin_FsOpen,
    Builtin_FsClose,
    Builtin_FsWrite,
    Builtin_FsRead,
    Builtin_FsFlush,
    Builtin_FsEof,
} Builtin;

#define IREGS 32
#define FREGS 16

#define STACK_SIZE 65536
#define CALL_STACK_SIZE 65536

typedef struct {
    uint64_t id;
    FILE* fp;
} FsFile;

///
/// Main data structure for the runtime virtual machine.
///
/// NOTICE: This structure is not necessarily used actively when running the
/// program. This is because the runner caches some values instead of storing
/// them in the struct. The point of this struct is mostly to provide some form
/// of cohesion of the virtual machine. This means that for debugging, this
/// internals of this struct CANNOT be relied on for live data.
///
typedef struct {
    FsFile* files;
    size_t files_size;
    size_t files_capacity;
    uint64_t next_file_id;
} VM;

void vm_construct(VM* vm);
void vm_destroy(VM* vm);

typedef uint8_t Reg;

typedef struct {
    uint64_t iregs[IREGS];
    double fregs[FREGS];
} Regs;

typedef struct {
    uint64_t* caller_sb;
    const uint32_t* return_ptr;
} Call;

/// Runner function for the VM.
///
/// 'program` is a program encoded according to the encoding rules. The program
/// is expected to exit before hitting the end, hence there's no size parameter.
int vm_run(VM* vm, const uint32_t* program);

int vm_exec_builtin(VM* vm, Builtin builtin, Regs* regs);
int vm_open_file(VM* vm, uint64_t* id, const char* path, const char* mode);
void vm_close_file(VM* vm, uint64_t id);
FILE* vm_file_fp(VM* vm, uint64_t id);

#endif
