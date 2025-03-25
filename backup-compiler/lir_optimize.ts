import {
    Fn,
    Ins,
    Label,
    Line,
    Program,
    ProgramStringifyer,
    Reg,
} from "./lir.ts";

export function lirOptimize(program: Program) {
    console.log("=== BEFORE OPTIMIZATION ===");
    console.log(new ProgramStringifyer(program).stringify());
    for (const fn of program.fns) {
        eliminatePushPop(fn);
        eliminateMovFnCall(fn);
        eliminateMovIntStoreReg(fn);
    }
    console.log("=== AFTER OPTIMIZATION ===");
    console.log(new ProgramStringifyer(program).stringify());
}

function eliminatePushPop(fn: Fn) {
    const candidates: number[] = [];

    for (let i = 0; i < fn.lines.length - 2; ++i) {
        const [push, kill, pop] = fn.lines.slice(i);
        if (
            push.ins.tag === "push" &&
            kill.ins.tag === "kill" &&
            pop.ins.tag === "pop" &&
            kill.labels.length === 0 &&
            pop.labels.length === 0 &&
            push.ins.reg === kill.ins.reg
        ) {
            candidates.push(i);
        }
    }

    for (const i of candidates.toReversed()) {
        if (i + 3 >= fn.lines.length) {
            fn.lines[i + 3].labels.push(...fn.lines[i].labels);
        }
        const [push, kill, pop] = fn.lines.slice(i);
        if (
            !(
                push.ins.tag === "push" &&
                kill.ins.tag === "kill" &&
                pop.ins.tag === "pop"
            )
        ) {
            throw new Error();
        }
        const toRemove = pop.ins.reg;
        const replacement = push.ins.reg;
        fn.lines.splice(i, 3);
        replaceReg(fn, toRemove, replacement);
    }
}

function eliminateMovFnCall(fn: Fn) {
    const candidates: number[] = [];

    for (let i = 0; i < fn.lines.length - 2; ++i) {
        const [movFn, callReg, kill] = fn.lines.slice(i);
        if (
            movFn.ins.tag === "mov_fn" &&
            callReg.ins.tag === "call_reg" &&
            kill.ins.tag === "kill" &&
            callReg.labels.length === 0 &&
            kill.labels.length === 0 &&
            movFn.ins.reg === callReg.ins.reg &&
            movFn.ins.reg === kill.ins.reg
        ) {
            candidates.push(i);
        }
    }

    for (const i of candidates.toReversed()) {
        const [movFn, callReg, kill] = fn.lines.slice(i);
        if (
            !(
                movFn.ins.tag === "mov_fn" &&
                callReg.ins.tag === "call_reg" &&
                kill.ins.tag === "kill"
            )
        ) {
            throw new Error();
        }
        const fnVal = movFn.ins.fn;
        const args = callReg.ins.args;
        fn.lines.splice(i + 1, 2);
        fn.lines[i].ins = { tag: "call_imm", fn: fnVal, args };
    }
}

function eliminateMovIntStoreReg(fn: Fn) {
    const candidates: number[] = [];

    for (let i = 0; i < fn.lines.length - 2; ++i) {
        const [movInt, storeReg, kill] = fn.lines.slice(i);
        if (
            movInt.ins.tag === "mov_int" &&
            storeReg.ins.tag === "store_reg" &&
            kill.ins.tag === "kill" &&
            storeReg.labels.length === 0 &&
            kill.labels.length === 0 &&
            movInt.ins.reg === storeReg.ins.reg &&
            movInt.ins.reg === kill.ins.reg
        ) {
            candidates.push(i);
        }
    }

    for (const i of candidates.toReversed()) {
        const [movInt, storeReg, kill] = fn.lines.slice(i);
        if (
            !(
                movInt.ins.tag === "mov_int" &&
                storeReg.ins.tag === "store_reg" &&
                kill.ins.tag === "kill"
            )
        ) {
            throw new Error();
        }
        const offset = storeReg.ins.offset;
        const val = movInt.ins.val;
        fn.lines.splice(i + 1, 2);
        fn.lines[i].ins = { tag: "store_imm", offset, val };
    }
}

function replaceReg(fn: Fn, cand: Reg, replacement: Reg) {
    const r = (reg: Reg): Reg => reg === cand ? replacement : reg;

    for (const { ins } of fn.lines) {
        switch (ins.tag) {
            case "error":
                break;
            case "nop":
                break;
            case "mov_int":
            case "mov_string":
            case "mov_fn":
                ins.reg = r(ins.reg);
                break;
            case "push":
            case "pop":
                ins.reg = r(ins.reg);
                break;
            case "load":
            case "store_reg":
                ins.reg = r(ins.reg);
                break;
            case "store_imm":
                break;
            case "call_reg":
                ins.reg = r(ins.reg);
                break;
            case "call_imm":
                break;
            case "jmp":
                break;
            case "jnz_reg":
                ins.reg = r(ins.reg);
                break;
            case "ret":
                break;
            case "lt":
            case "eq":
            case "add":
            case "mul":
                ins.dst = r(ins.dst);
                ins.src = r(ins.src);
                break;
            case "kill":
                ins.reg = r(ins.reg);
                break;
            default: {
                const _: never = ins;
            }
        }
    }
}

