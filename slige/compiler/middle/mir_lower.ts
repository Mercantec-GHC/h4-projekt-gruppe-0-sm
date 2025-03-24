import * as mir from "./mir.ts";
import * as lir from "./lir.ts";
import { Ctx, exhausted, IdMap, Ids, todo } from "@slige/common";
import { BlockId } from "./mir.ts";
import { LirFnStringifyer } from "@slige/stringify";

export class MirLowerer {
    private lirFns: lir.Fn[] = [];

    public constructor(
        private ctx: Ctx,
        private mirFns: mir.Fn[],
    ) {}

    public lower() {
        for (const fn of this.mirFns) {
            this.lirFns.push(new FnLowerer(fn).lower());
        }
    }

    public lirString(): string {
        return this.lirFns
            .values()
            .map((fn) => new LirFnStringifyer(this.ctx).fn(fn))
            .toArray()
            .join("\n");
    }
}

export class FnLowerer {
    private localIds = new Ids<lir.LocalId>();
    private locals = new IdMap<lir.LocalId, lir.Local>();

    private localVersionCounter = new IdMap<mir.LocalId, number>();

    private blocks = new IdMap<BlockId, lir.Block>();

    private blockLocals = new IdMap<BlockId, IdMap<mir.LocalId, lir.Local>>();

    private currentBlockId?: BlockId;

    public constructor(
        private fn: mir.Fn,
    ) {}

    public lower(): lir.Fn {
        for (const mirBlock of this.fn.blocks.values()) {
            const lirBlock = this.lowerBlock(mirBlock);
            this.blocks.set(lirBlock.id, lirBlock);
        }
        return {
            mirFn: this.fn,
            blocks: this.blocks,
            locals: this.locals,
        };
    }

    private lowerBlock(block: mir.Block): lir.Block {
        this.currentBlockId = block.id;
        this.blockLocals.set(block.id, new IdMap());
        const stmts: lir.Stmt[] = [];

        const locals = new IdMap<mir.LocalId, lir.Local>();
        for (const mirId of this.fn.locals.keys()) {
            const lirId = this.localIds.nextThenStep();
            this.localVersionCounter.set(mirId, 0);
            const local: lir.Local = {
                id: lirId,
                base: mirId,
                version: block.id.rawId,
            };
            locals.set(mirId, local);
            this.locals.set(lirId, local);
            this.blockLocals.get(block.id)!.set(mirId, local);
        }

        const superBlocks = this.fn.blocks
            .values()
            .filter((b) => blockHasTarget(b, block.id))
            .toArray();

        if (block.id.rawId !== 0) {
            for (const mirId of locals.keys()) {
                const sources: lir.PhiSource[] = [];
                for (const superBlock of superBlocks) {
                    const local = this.blockLocals.get(superBlock.id)!.get(
                        mirId,
                    )!;
                    sources.push({ branch: superBlock.id, local: local.id });
                }
                stmts.push(
                    this.stmt({
                        tag: "assign",
                        local: locals.get(mirId)!.id,
                        rval: { tag: "phi", sources },
                    }),
                );
            }
        }

        for (const stmt of block.stmts) {
            stmts.push(...this.lowerStmt(stmt));
        }
        const [s1, ter] = this.lowerTer(block.terminator);
        stmts.push(...s1);
        return { id: block.id, stmts, ter };
    }

    private lowerStmt(stmt: mir.Stmt): lir.Stmt[] {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                return [this.stmt({ tag: "error" })];
            case "assign":
                return this.lowerAssignStmt(stmt, k);
            case "fake_read":
                return [this.stmt({ tag: "error" })];
            case "deinit":
                return todo();
            case "live":
                return todo();
            case "dead":
                return todo();
            case "mention":
                return todo();
        }
        exhausted(k);
    }

    private lowerAssignStmt(stmt: mir.Stmt, kind: mir.AssignStmt): lir.Stmt[] {
        if (kind.place.proj.length !== 0) {
            return todo();
        }
        const [s1, rval] = this.lowerRVal(kind.rval);

        const version = this.localVersionCounter.get(kind.place.local)!;
        this.localVersionCounter.set(kind.place.local, version + 1);

        const lirId = this.localIds.nextThenStep();
        this.blockLocals
            .get(this.currentBlockId!)!
            .set(kind.place.local, {
                id: lirId,
                base: kind.place.local,
                version,
            });

        return [...s1, this.stmt({ tag: "assign", local: lirId, rval })];
    }

    private lowerRVal(rval: mir.RVal): [lir.Stmt[], lir.RVal] {
        switch (rval.tag) {
            case "error":
                return [[], { tag: "error" }];
            case "use": {
                switch (rval.operand.tag) {
                    case "error":
                        return [[], { tag: "error" }];
                    case "copy":
                    case "move":
                        return [[], {
                            tag: "use",
                            local: this.blockLocals
                                .get(this.currentBlockId!)!
                                .get(rval.operand.place.local)!.id,
                        }];
                    case "const":
                        return [[], {
                            tag: "const",
                            val: rval.operand.val,
                        }];
                }
                return exhausted(rval.operand);
            }
            case "repeat":
            case "ref":
            case "ptr":
            case "binary":
            case "unary":
                return todo();
            case "adt": {
                console.log(rval);
                return todo();
            }
            case "call":
            case "builtin":
                return todo();
        }
        exhausted(rval);
    }

    private lowerTer(ter: mir.Ter): [lir.Stmt[], lir.Ter] {
        const tk = ter.kind;
        switch (tk.tag) {
            case "unset":
                return [[], this.ter({ tag: "error" })];
            case "goto":
                return [[], this.ter({ tag: "goto", target: tk.target })];
            case "switch": {
                const [s1, discr] = this.lowerOperand(tk.discr);
                return [
                    [...s1],
                    this.ter({
                        tag: "switch",
                        discr,
                        targets: tk.targets
                            .map(({ target, value }) => ({ target, value })),
                        otherwise: tk.otherwise,
                    }),
                ];
            }
            case "return":
                return [[], this.ter({ tag: "return" })];
            case "unreachable":
                return [[], this.ter({ tag: "error" })];
            case "drop":
                return [[], this.ter({ tag: "error" })];
        }
        exhausted(tk);
    }

    private lowerOperand(operand: mir.Operand): [lir.Stmt[], lir.RVal] {
        switch (operand.tag) {
            case "error":
                return [[], { tag: "error" }];
            case "copy":
            case "move":
                return todo(operand.tag);
            case "const":
                return [[], { tag: "const", val: operand.val }];
        }
        exhausted(operand);
    }

    private stmt(kind: lir.StmtKind): lir.Stmt {
        return { kind };
    }

    private ter(kind: lir.TerKind): lir.Ter {
        return { kind };
    }
}

function blockHasTarget(block: mir.Block, target: BlockId): boolean {
    const tk = block.terminator.kind;
    switch (tk.tag) {
        case "unset":
            return false;
        case "goto":
            return tk.target == target;
        case "switch":
            return tk.targets.some((st) => st.target === target) ||
                tk.otherwise == target;
        case "return":
            return false;
        case "unreachable":
            return false;
        case "drop":
            return tk.target == target;
    }
    exhausted(tk);
}
