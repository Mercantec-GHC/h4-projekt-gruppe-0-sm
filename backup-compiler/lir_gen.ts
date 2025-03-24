import {
    Fn,
    Ins,
    Label,
    Line,
    Program,
    ProgramStringifyer,
    Reg,
} from "./lir.ts";
import { MirGen } from "./mir_gen.ts";
import * as ast from "./ast.ts";
import * as mir from "./mir.ts";

export class LirGen {
    private strings = new StringIntern();

    private fnIds = 0;
    private fns = new Map<number, Fn>();
    private stmtFns = new Map<number, Fn>();

    public constructor(
        private ast: ast.Stmt[],
        private mirGen: MirGen,
    ) {}

    public generate(): Program {
        for (const stmt of this.ast) {
            if (stmt.kind.tag !== "fn") {
                throw new Error("only functions can compile top level");
            }
            const mir = this.mirGen.fnMir(stmt, stmt.kind);
            const id = this.fnIds++;
            const label = `sbc__${stmt.kind.ident}`;
            const fn: Fn = { id, label, mir, lines: [] };
            this.fns.set(id, fn);
            this.stmtFns.set(stmt.id, fn);
        }

        for (const id of this.fns.keys()) {
            const fn = this.fns.get(id)!;
            const stmtKind = fn.mir.stmt.kind;
            if (stmtKind.tag !== "fn") {
                throw new Error();
            }

            // if (stmtKind.attrs.at(0)?.ident === "c_function") {
            //     const arg = stmtKind.attrs.at(0)!.args.at(0);
            //     if (!arg || arg.kind.tag !== "string") {
            //         throw new Error("incorrect args for attribute");
            //     }
            //     const label = arg.kind.val;
            //     new CFunctionGen(fn, label).generate();
            //     continue;
            // }

            new FnGen(
                fn,
                this.strings,
                this.stmtFns,
            ).generate();
        }
        return {
            fns: this.fns.values().toArray(),
            strings: this.strings.done(),
        };
    }
}

class FnGen {
    private regIds = 0;

    private labelIds = 0;
    private blockLabels = new Map<number, Label>();

    private currentLabels: Label[] = [];

    private nextOffset = -8;
    private localOffsets = new Map<number, number>();

    public constructor(
        private fn: Fn,
        private strings: StringIntern,
        private stmtFns: Map<number, Fn>,
    ) {}

    public generate() {
        for (const block of this.fn.mir.blocks) {
            const label = this.labelIds++;
            this.blockLabels.set(block.id, label);
        }
        for (const local of this.fn.mir.locals) {
            this.localOffsets.set(local.id, this.nextOffset);
            this.nextOffset -= 8;
        }
        for (const block of this.fn.mir.blocks) {
            this.currentLabels.push(this.blockLabels.get(block.id)!);
            for (const stmt of block.stmts) {
                this.lowerStmt(stmt);
            }
            this.lowerTer(block.ter);
        }
        if (this.currentLabels.length > 0) {
            this.pushIns({ tag: "nop" });
        }
    }

    private lowerStmt(stmt: mir.Stmt) {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                this.pushIns({ tag: "error" });
                return;
            case "push": {
                switch (k.val.tag) {
                    case "string": {
                        const reg = this.reg();
                        const stringId = this.strings.intern(k.val.val);
                        this.pushIns({ tag: "mov_string", reg, stringId });
                        this.pushIns({ tag: "push", reg });
                        return;
                    }
                    case "int": {
                        const reg = this.reg();
                        this.pushIns({ tag: "mov_int", reg, val: k.val.val });
                        this.pushIns({ tag: "push", reg });
                        return;
                    }
                    case "fn": {
                        const reg = this.reg();
                        this.pushIns({
                            tag: "mov_fn",
                            reg,
                            fn: this.stmtFns.get(k.val.stmt.id)!,
                        });
                        this.pushIns({ tag: "push", reg });
                        return;
                    }
                }
                const __: never = k.val;
                return;
            }
            case "pop": {
                const reg = this.reg();
                this.pushIns({ tag: "pop", reg });
                return;
            }
            case "load": {
                const reg = this.reg();
                const offset = this.localOffsets.get(k.local.id)!;
                this.pushIns({ tag: "load", reg, offset });
                this.pushIns({ tag: "push", reg });
                return;
            }
            case "store": {
                const reg = this.reg();
                const offset = this.localOffsets.get(k.local.id)!;
                this.pushIns({ tag: "pop", reg });
                this.pushIns({ tag: "store", offset, reg });
                return;
            }
            case "call": {
                const reg = this.reg();
                this.pushIns({ tag: "pop", reg });
                this.pushIns({ tag: "call_reg", reg });
                return;
            }
            case "lt":
            case "eq":
            case "add":
            case "mul": {
                const dst = this.reg();
                const src = this.reg();
                this.pushIns({ tag: "pop", reg: src });
                this.pushIns({ tag: "pop", reg: dst });
                this.pushIns({ tag: k.tag, dst, src });
                this.pushIns({ tag: "push", reg: dst });
                return;
            }
        }
        const _: never = k;
    }

    private lowerTer(ter: mir.Ter) {
        const k = ter.kind;
        switch (k.tag) {
            case "error":
                this.pushIns({ tag: "error" });
                return;
            case "unset":
                this.pushIns({ tag: "error" });
                return;
            case "return":
                this.pushIns({ tag: "ret" });
                return;
            case "goto":
                this.pushIns({
                    tag: "jmp",
                    target: this.blockLabels.get(k.target.id)!,
                });
                return;
            case "if": {
                const reg = this.reg();
                this.pushIns({ tag: "pop", reg });
                this.pushIns({
                    tag: "jnz_reg",
                    reg,
                    target: this.blockLabels.get(k.falsy.id)!,
                });
                this.pushIns({
                    tag: "jmp",
                    target: this.blockLabels.get(k.falsy.id)!,
                });
                return;
            }
        }
        const _: never = k;
    }

    private pushIns(ins: Ins) {
        this.fn.lines.push({ labels: this.currentLabels, ins });
        this.currentLabels = [];
    }

    private reg(): Reg {
        const reg = this.regIds++;
        return reg;
    }
}

class CFunctionGen {
    public constructor(
        private fn: Fn,
        private label: string,
    ) {}

    public generate() {
    }
}

class StringIntern {
    private ids = 0;
    private strings = new Map<number, string>();

    public intern(value: string): number {
        const entry = this.strings
            .entries()
            .find(([_id, v]) => v === value);
        if (entry) {
            return entry[0];
        }
        const id = this.ids++;
        this.strings.set(id, value);
        return id;
    }

    public done(): Map<number, string> {
        return this.strings;
    }
}
