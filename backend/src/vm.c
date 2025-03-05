#include "vm.h"
#include "util.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

void vm_construct(VM* vm)
{
    size_t files_capacity = 64;
    FsFile* files = malloc(sizeof(FsFile) * files_capacity);

    *vm = (VM) {
        .files = files,
        .files_size = 0,
        .files_capacity = files_capacity,
        .next_file_id = 0,
    };

    vm->files[vm->files_size++] = (FsFile) { .id = 0, .fp = stdin };
    vm->files[vm->files_size++] = (FsFile) { .id = 1, .fp = stdout };
    vm->files[vm->files_size++] = (FsFile) { .id = 2, .fp = stderr };
    vm->next_file_id += 3;
}

void vm_destroy(VM* vm)
{
    (void)vm;
}

ALWAYS_INLINE static inline Op line_op(uint32_t line)
{
    return line & 0xff;
}

ALWAYS_INLINE static inline Reg line_dst(uint32_t line)
{
    return line >> 8 & 0xff;
}

ALWAYS_INLINE static inline Reg line_src_right(uint32_t line)
{
    return line >> 16 & 0xff;
}

ALWAYS_INLINE static inline Reg line_src_left(uint32_t line)
{
    return line >> 24 & 0xff;
}

ALWAYS_INLINE static inline uint32_t eat_i32(const uint32_t** pc)
{
    uint32_t imm = **pc;
    ++*pc;
    return imm;
}

ALWAYS_INLINE static inline uint64_t eat_i64(const uint32_t** pc)
{
    uint64_t imm = **pc;
    ++*pc;
    imm &= (uint64_t)**pc << 32;
    ++*pc;
    return imm;
}

ALWAYS_INLINE static inline double eat_f64(const uint32_t** pc)
{
    return (double)eat_i64(pc);
}

int vm_run(VM* vm, const uint32_t* program)
{
    (void)vm;

    Regs regs = {
        .iregs = { 0 },
        .fregs = { 0.0 },
    };

    uint64_t* const stack = malloc(STACK_SIZE * sizeof(uint64_t));
    Call* const call_stack_base = malloc(CALL_STACK_SIZE * sizeof(Call));

    Call* call_stack = call_stack_base;

    const uint32_t* program_base = program;
    const uint32_t* pc = program_base;

    uint64_t* sb = stack;
    uint64_t* sp = sb;

    for (;;) {
        uint32_t line = *pc;
        Op op = line_op(line);
        ++pc;
        switch (op) {
            case Op_Nop: {
                break;
            }
            case Op_Halt: {
                goto halt_program;
            }
            case Op_Builtin: {
                break;
            }

                // ---

            case Op_Call: {
                Reg reg = line_src_left(line);
                *call_stack = (Call) { .caller_sb = sb, .return_ptr = pc + 1 };
                ++call_stack;
                pc = program_base + regs.iregs[reg];
                break;
            }
            case Op_CallI: {
                uint32_t ptr = eat_i32(&pc);
                *call_stack = (Call) { .caller_sb = sb, .return_ptr = pc + 1 };
                ++call_stack;
                pc = program_base + ptr;
                break;
            }
            case Op_Ret: {
                --call_stack;
                sb = call_stack->caller_sb;
                pc = call_stack->return_ptr;
                break;
            }
            case Op_Alloca: {
                uint32_t size = eat_i32(&pc);
                sp += size;
                break;
            }

                // ---

            case Op_Jmp: {
                uint32_t ptr = eat_i32(&pc);
                pc = program_base + ptr;
                break;
            }
            case Op_Jnz: {
                uint32_t ptr = eat_i32(&pc);
                if (regs.iregs[line_src_right(line)] != 0) {
                    pc = program_base + ptr;
                } else {
                    ++pc;
                }
                break;
            }
            case Op_Jz: {
                Reg reg = line_src_left(line);
                uint32_t ptr = eat_i32(&pc);
                if (regs.iregs[reg] == 0) {
                    pc = program_base + ptr;
                } else {
                    ++pc;
                }
                break;
            }

                // ---

            case Op_Load8: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.iregs[dst] = *(uint8_t*)regs.iregs[src];
                break;
            }
            case Op_LoadI8: {
                Reg dst = line_dst(line);
                uint64_t addr = eat_i64(&pc);
                regs.iregs[dst] = *(uint8_t*)addr;
                break;
            }
            case Op_LoadA8: {
                Reg dst = line_dst(line);
                Reg base = line_src_left(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                regs.iregs[dst] = *(uint8_t*)(addr);
                break;
            }
            case Op_Load16: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.iregs[dst] = *(uint16_t*)regs.iregs[src];
                break;
            }
            case Op_LoadI16: {
                Reg dst = line_dst(line);
                uint64_t addr = eat_i64(&pc);
                regs.iregs[dst] = *(uint16_t*)addr;
                break;
            }
            case Op_LoadA16: {
                Reg dst = line_dst(line);
                Reg base = line_src_left(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                regs.iregs[dst] = *(uint16_t*)(addr);
                break;
            }
            case Op_Load32: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.iregs[dst] = *(uint32_t*)regs.iregs[src];
                break;
            }
            case Op_LoadI32: {
                Reg dst = line_dst(line);
                uint64_t addr = eat_i64(&pc);
                regs.iregs[dst] = *(uint32_t*)addr;
                break;
            }
            case Op_LoadA32: {
                Reg dst = line_dst(line);
                Reg base = line_src_left(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                regs.iregs[dst] = *(uint32_t*)(addr);
                break;
            }
            case Op_Load64: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.iregs[dst] = *(uint64_t*)regs.iregs[src];
                break;
            }
            case Op_LoadI64: {
                Reg dst = line_dst(line);
                uint64_t addr = eat_i64(&pc);
                regs.iregs[dst] = *(uint64_t*)addr;
                break;
            }
            case Op_LoadA64: {
                Reg dst = line_dst(line);
                Reg base = line_src_left(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                regs.iregs[dst] = *(uint64_t*)(addr);
                break;
            }
            case Op_LoadF: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.fregs[dst] = *(double*)regs.iregs[src];
                break;
            }
            case Op_LoadIF: {
                Reg dst = line_dst(line);
                uint64_t addr = eat_i64(&pc);
                regs.fregs[dst] = *(double*)addr;
                break;
            }
            case Op_LoadAF: {
                Reg dst = line_dst(line);
                Reg base = line_src_left(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                regs.fregs[dst]
                    = *(double*)(regs.iregs[base] + regs.iregs[offset] * incr);
                break;
            }

                // ---

            case Op_Store8: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                *(uint8_t*)regs.iregs[dst] = (uint8_t)regs.iregs[src];
                break;
            }
            case Op_StoreA8: {
                Reg src = line_src_left(line);
                Reg base = line_dst(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                *(uint8_t*)addr = (uint8_t)regs.iregs[src];
                break;
            }
            case Op_Store16: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                *(uint16_t*)regs.iregs[dst] = (uint16_t)regs.iregs[src];
                break;
            }
            case Op_StoreA16: {
                Reg src = line_src_left(line);
                Reg base = line_dst(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                *(uint16_t*)addr = (uint16_t)regs.iregs[src];
                break;
            }
            case Op_Store32: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                *(uint32_t*)regs.iregs[dst] = (uint32_t)regs.iregs[src];
                break;
            }
            case Op_StoreA32: {
                Reg src = line_src_left(line);
                Reg base = line_dst(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                *(uint32_t*)addr = (uint32_t)regs.iregs[src];
                break;
            }
            case Op_Store64: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                *(uint64_t*)regs.iregs[dst] = regs.iregs[src];
                break;
            }
            case Op_StoreA64: {
                Reg src = line_src_left(line);
                Reg base = line_dst(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                *(uint64_t*)addr = regs.iregs[src];
                break;
            }
            case Op_StoreF: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                *(double*)regs.iregs[dst] = regs.fregs[src];
                break;
            }
            case Op_StoreAF: {
                Reg src = line_src_left(line);
                Reg base = line_dst(line);
                Reg offset = line_src_right(line);
                uint32_t incr = eat_i32(&pc);
                uint64_t addr = regs.iregs[base] + regs.iregs[offset] * incr;
                *(double*)addr = regs.fregs[src];
                break;
            }

                // ---

            case Op_LoadImm32: {
                Reg dst = line_dst(line);
                regs.iregs[dst] = eat_i32(&pc);
                break;
            }
            case Op_LoadImm64: {
                Reg dst = line_dst(line);
                regs.iregs[dst] = eat_i64(&pc);
                break;
            }
            case Op_LoadImmF: {
                Reg dst = line_dst(line);
                regs.fregs[dst] = eat_f64(&pc);
                break;
            }
            case Op_LoadSb: {
                Reg dst = line_dst(line);
                regs.iregs[dst] = (uint64_t)sb;
                break;
            }
            case Op_LoadSp: {
                Reg dst = line_dst(line);
                regs.iregs[dst] = (uint64_t)sp;
                break;
            }

                // ---

            case Op_MovII: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.iregs[dst] = regs.iregs[src];
                break;
            }
            case Op_MovIF: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.fregs[dst] = (double)regs.iregs[src];
                break;
            }
            case Op_MovFI: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.iregs[dst] = (uint64_t)regs.fregs[src];
                break;
            }
            case Op_MovFF: {
                Reg dst = line_dst(line);
                Reg src = line_src_left(line);
                regs.fregs[dst] = regs.fregs[src];
                break;
            }

            case Op_Push: {
                Reg src = line_src_left(line);
                *sp = regs.iregs[src];
                ++sp;
                break;
            }
            case Op_Pop: {
                Reg dst = line_dst(line);
                --sp;
                regs.iregs[dst] = *sp;
                break;
            }

            case Op_PushF: {
                Reg src = line_src_left(line);
                *sp = (uint64_t)regs.fregs[src];
                ++sp;
                break;
            }
            case Op_PopF: {
                Reg dst = line_dst(line);
                --sp;
                regs.fregs[dst] = (double)*sp;
                break;
            }

                // ---

            case Op_Eq: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] == regs.iregs[right] ? 1 : 0;
                break;
            }
            case Op_Ne: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] != regs.iregs[right] ? 1 : 0;
                break;
            }
            case Op_Lt: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] < regs.iregs[right] ? 1 : 0;
                break;
            }
            case Op_Gt: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] > regs.iregs[right] ? 1 : 0;
                break;
            }
            case Op_Lte: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] <= regs.iregs[right] ? 1 : 0;
                break;
            }
            case Op_Gte: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] >= regs.iregs[right] ? 1 : 0;
                break;
            }
            case Op_And: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] & regs.iregs[right];
                break;
            }
            case Op_Or: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] | regs.iregs[right];
                break;
            }
            case Op_Xor: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] ^ regs.iregs[right];
                break;
            }
            case Op_Add: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] + regs.iregs[right];
                break;
            }
            case Op_Sub: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] - regs.iregs[right];
                break;
            }
            case Op_Mul: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] * regs.iregs[right];
                break;
            }
            case Op_Div: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] / regs.iregs[right];
                break;
            }
            case Op_Rem: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.iregs[left] / regs.iregs[right];
                break;
            }
            case Op_IMul: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                int64_t val
                    = (int64_t)regs.iregs[left] * (int64_t)regs.iregs[right];
                regs.iregs[dst] = (uint64_t)val;
                break;
            }
            case Op_IDiv: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                int64_t val
                    = (int64_t)regs.iregs[left] / (int64_t)regs.iregs[right];
                regs.iregs[dst] = (uint64_t)val;
                break;
            }

                // ---

            case Op_EqI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] == right ? 1 : 0;
                break;
            }
            case Op_NeI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] != right ? 1 : 0;
                break;
            }
            case Op_LtI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] < right ? 1 : 0;
                break;
            }
            case Op_GtI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] > right ? 1 : 0;
                break;
            }
            case Op_LteI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] <= right ? 1 : 0;
                break;
            }
            case Op_GteI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] >= right ? 1 : 0;
                break;
            }
            case Op_AndI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] & right;
                break;
            }
            case Op_OrI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] | right;
                break;
            }
            case Op_XorI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] ^ right;
                break;
            }
            case Op_AddI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] + right;
                break;
            }
            case Op_SubI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] - right;
                break;
            }
            case Op_RSubI: {
                Reg dst = line_dst(line);
                uint64_t left = eat_i32(&pc);
                Reg right = line_src_right(line);
                regs.iregs[dst] = left - regs.iregs[right];
                break;
            }
            case Op_MulI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] * right;
                break;
            }
            case Op_DivI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] / right;
                break;
            }
            case Op_RemI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                regs.iregs[dst] = regs.iregs[left] % right;
                break;
            }
            case Op_IMulI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                int64_t val = (int64_t)regs.iregs[left] * (int64_t)right;
                regs.iregs[dst] = (uint64_t)val;
                break;
            }
            case Op_IDivI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                uint64_t right = eat_i32(&pc);
                int64_t val = (int64_t)regs.iregs[left] / (int64_t)right;
                regs.iregs[dst] = (uint64_t)val;
                break;
            }

                // ---

            case Op_EqF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.fregs[left] == regs.fregs[right] ? 1 : 0;
                break;
            }
            case Op_NeF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.fregs[left] != regs.fregs[right] ? 1 : 0;
                break;
            }
            case Op_LtF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.fregs[left] < regs.fregs[right] ? 1 : 0;
                break;
            }
            case Op_GtF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.fregs[left] > regs.fregs[right] ? 1 : 0;
                break;
            }
            case Op_LteF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.fregs[left] <= regs.fregs[right] ? 1 : 0;
                break;
            }
            case Op_GteF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.iregs[dst] = regs.fregs[left] >= regs.fregs[right] ? 1 : 0;
                break;
            }
            case Op_AddF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.fregs[dst] = regs.fregs[left] + regs.fregs[right];
                break;
            }
            case Op_SubF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.fregs[dst] = regs.fregs[left] - regs.fregs[right];
                break;
            }
            case Op_MulF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.fregs[dst] = regs.fregs[left] * regs.fregs[right];
                break;
            }
            case Op_DivF: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                Reg right = line_src_right(line);
                regs.fregs[dst] = regs.fregs[left] / regs.fregs[right];
                break;
            }

                // ---

            case Op_EqFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.iregs[dst] = regs.fregs[left] == right ? 1 : 0;
                break;
            }
            case Op_NeFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.iregs[dst] = regs.fregs[left] != right ? 1 : 0;
                break;
            }
            case Op_LtFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.iregs[dst] = regs.fregs[left] < right ? 1 : 0;
                break;
            }
            case Op_GtFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.iregs[dst] = regs.fregs[left] > right ? 1 : 0;
                break;
            }
            case Op_LteFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.iregs[dst] = regs.fregs[left] <= right ? 1 : 0;
                break;
            }
            case Op_GteFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.iregs[dst] = regs.fregs[left] >= right ? 1 : 0;
                break;
            }
            case Op_AddFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.fregs[dst] = regs.fregs[left] + right;
                break;
            }
            case Op_SubFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.fregs[dst] = regs.fregs[left] - right;
                break;
            }
            case Op_RSubFI: {
                Reg dst = line_dst(line);
                double left = eat_f64(&pc);
                Reg right = line_src_right(line);
                regs.fregs[dst] = left - regs.fregs[right];
                break;
            }
            case Op_MulFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.fregs[dst] = regs.fregs[left] * right;
                break;
            }
            case Op_DivFI: {
                Reg dst = line_dst(line);
                Reg left = line_src_left(line);
                double right = eat_f64(&pc);
                regs.fregs[dst] = regs.fregs[left] / right;
                break;
            }
        }
    }

halt_program:
    free(stack);
    free(call_stack_base);
    return 0;
}

int vm_exec_builtin(VM* vm, Builtin builtin, Regs* regs)
{
    MAYBE_UNUSED uint64_t* res = &regs->iregs[0];
    MAYBE_UNUSED uint64_t arg1 = regs->iregs[1];
    MAYBE_UNUSED uint64_t arg2 = regs->iregs[2];
    MAYBE_UNUSED uint64_t arg3 = regs->iregs[3];
    MAYBE_UNUSED uint64_t arg4 = regs->iregs[4];

    switch (builtin) {
        case Builtin_Alloc: {
            break;
        }
        case Builtin_FsOpen: {
            uint64_t id = 0;
            int r = vm_open_file(vm, &id, (char*)arg1, (char*)arg2);
            *res = r == 0 ? 0 : 1;
            break;
        }
        case Builtin_FsClose: {
            vm_close_file(vm, arg1);
            break;
        }
        case Builtin_FsWrite:
            fwrite((void*)arg2, arg3, 1, vm_file_fp(vm, arg1));
            break;
        case Builtin_FsRead:
            fread((void*)arg2, arg3, 1, vm_file_fp(vm, arg1));
            break;
        case Builtin_FsFlush:
            fflush(vm_file_fp(vm, arg1));
            break;
        case Builtin_FsEof:
            *res = feof(vm_file_fp(vm, arg1)) == EOF ? 1 : 0;
            break;
    }
    return 0;
}

int vm_open_file(VM* vm, uint64_t* id, const char* path, const char* mode)
{
    FILE* fp = fopen(path, mode);
    if (fp == NULL)
        return -1;
    *id = vm->next_file_id;
    ++vm->next_file_id;
    vm->files[vm->files_size++] = (FsFile) { *id, fp };
    return 0;
}

void vm_close_file(VM* vm, uint64_t id)
{
    size_t i = 0;
    for (; i < vm->files_size; ++i)
        if (vm->files[i].id == id)
            break;
    if (i == vm->files_size)
        return;
    for (size_t j = i; j < vm->files_size - 1; ++j)
        vm->files[j] = vm->files[j + 1];
}

FILE* vm_file_fp(VM* vm, uint64_t id)
{
    for (size_t i = 0; i < vm->files_size; ++i)
        if (vm->files[i].id == id)
            return vm->files[i].fp;
    return NULL;
}
