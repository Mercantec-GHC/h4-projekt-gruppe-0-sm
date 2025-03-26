import * as ast from "./ast.ts";
import { Block, Fn, FnStringifyer } from "./mir.ts";

export function optimizeMirFn(fn: Fn) {
    //console.log(`=== OPTIMIZING ${(fn.stmt.kind as ast.FnStmt).ident} ===`);
    //console.log("=== BEFORE OPTIMIZATION ===");
    //console.log(new FnStringifyer(fn).stringify());

    const blockSize = fn.blocks
        .map((block) => block.stmts.length)
        .toSorted()
        .at(-1)! + 1;
    let sizeBefore = fnSize(fn, blockSize);

    const sizeHistory = new Set([sizeBefore]);
    let repeats = 0;

    while (repeats < 1) {
        eliminateUnreachable(fn);
        joinSequentialBlocks(fn);

        const sizeAfter = fnSize(fn, blockSize);
        sizeBefore = sizeAfter;
        if (sizeHistory.has(sizeBefore)) {
            repeats += 1;
        }
        sizeHistory.add(sizeBefore);
    }

    //console.log("=== AFTER OPTIMIZATION ===");
    //console.log(new FnStringifyer(fn).stringify());
}

function fnSize(fn: Fn, blockSize: number): number {
    return fn.blocks
        .reduce((acc, block) => acc + blockSize + block.stmts.length, 0);
}

function eliminateUnreachable(fn: Fn) {
    const toRemove = new Set<number>();

    for (const block of fn.blocks) {
        const preds = cfgPredecessors(fn, block);

        if (block.id === fn.entry.id || preds.length !== 0) {
            continue;
        }
        toRemove.add(block.id);
    }

    fn.blocks = fn.blocks
        .filter((block) => !toRemove.has(block.id));
}

function joinSequentialBlocks(fn: Fn) {
    const toRemove = new Set<number>();

    for (const first of fn.blocks) {
        const firstSuccs = cfgSuccessors(first);
        if (firstSuccs.length !== 1) {
            continue;
        }
        const [second] = firstSuccs;
        const secondPreds = cfgPredecessors(fn, second);
        if (secondPreds.length !== 1) {
            continue;
        }
        first.stmts.push(...second.stmts);
        first.ter = second.ter;
        toRemove.add(second.id);
        if (second.id === fn.exit.id) {
            fn.exit = first;
        }
    }

    fn.blocks = fn.blocks
        .filter((block) => !toRemove.has(block.id));
}

function cfgPredecessors(fn: Fn, block: Block): Block[] {
    return fn.blocks
        .filter((b) => cfgSuccessors(b).some((s) => s.id === block.id));
}

function cfgSuccessors(block: Block): Block[] {
    const tk = block.ter.kind;
    switch (tk.tag) {
        case "error":
        case "unset":
        case "return":
            return [];
        case "goto":
            return [tk.target];
        case "if":
            return [tk.truthy, tk.falsy];
    }
}
