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

    let changed = true;
    let sizeBefore = program.fns
        .reduce((acc, fn) => acc + fn.lines.length, 0);

    const sizeHistory = new Set([sizeBefore]);
    let repeats = 0;

    while (changed && repeats < 3) {
        for (const fn of program.fns) {
            eliminatePushPop(fn);
            eliminateMovFnCall(fn);
            eliminateMovIntStoreReg(fn);
            eliminatePushPopShadowed(fn);
        }
        const sizeAfter = program.fns
            .reduce((acc, fn) => acc + fn.lines.length, 0);
        if (sizeAfter !== sizeBefore) {
            changed = true;
        }
        sizeBefore = sizeAfter;
        if (sizeHistory.has(sizeBefore)) {
            repeats += 1;
        }
        sizeHistory.add(sizeBefore);
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
        const sReg = storeReg.ins.sReg;
        const val = movInt.ins.val;
        fn.lines.splice(i + 1, 2);
        fn.lines[i].ins = { tag: "store_imm", sReg, val };
    }
}

function eliminatePushPopShadowed(fn: Fn) {
    type Cand = { push: number; pop: number };
    const candidates: Cand[] = [];

    outer: for (let i = 0; i < fn.lines.length - 1; ++i) {
        const push = fn.lines[i];
        if (push.ins.tag !== "push") {
            continue;
        }
        for (let j = i + 1; j < fn.lines.length; ++j) {
            const line = fn.lines[j];
            if (line.labels.length !== 0) {
                continue outer;
            }
            if (line.ins.tag !== "pop" && pollutesStack(line.ins)) {
                break;
            }
            if (line.ins.tag !== "pop") {
                continue;
            }
            candidates.push({ push: i, pop: j });
            break;
        }
    }

    for (const { push: pushIdx, pop: popIdx } of candidates.toReversed()) {
        const push = fn.lines[pushIdx];
        const pop = fn.lines[popIdx];
        if (!(push.ins.tag === "push" && pop.ins.tag === "pop")) {
            throw new Error();
        }
        const toRemove = pop.ins.reg;
        const replacement = push.ins.reg;
        fn.lines.splice(popIdx, 1);
        for (let i = pushIdx + 1; i <= popIdx - 1; ++i) {
            const kill = fn.lines[i].ins;
            if (kill.tag === "kill" && kill.reg === push.ins.reg) {
                fn.lines.splice(i, 1);
                break;
            }
        }
        fn.lines.splice(pushIdx, 1);
        replaceReg(fn, toRemove, replacement);
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
            case "alloc_param":
            case "alloc_local":
                ins.reg = r(ins.reg);
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
                ins.sReg = r(ins.sReg);
                break;
            case "store_imm":
                ins.sReg = r(ins.sReg);
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

function pollutesStack(ins: Ins): boolean {
    switch (ins.tag) {
        case "error":
        case "nop":
        case "alloc_param":
        case "alloc_local":
        case "mov_int":
        case "mov_string":
        case "mov_fn":
            return false;
        case "push":
        case "pop":
            return true;
        case "load":
        case "store_reg":
        case "store_imm":
            return false;
        case "call_reg":
        case "call_imm":
            return true;
        case "jmp":
        case "jnz_reg":
        case "ret":
            return false;
        case "lt":
        case "eq":
        case "add":
        case "mul":
            return true;
        case "kill":
            return false;
    }
}
