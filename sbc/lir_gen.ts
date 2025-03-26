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
            const fn: Fn = {
                id,
                label,
                mir,
                lines: [],
                frameSize: 0,
                localOffsets: new Map(),
                localRegs: new Map(),
            };
            this.fns.set(id, fn);
            this.stmtFns.set(stmt.id, fn);
        }

        for (const id of this.fns.keys()) {
            const fn = this.fns.get(id)!;
            const stmtKind = fn.mir.stmt.kind;
            if (stmtKind.tag !== "fn") {
                throw new Error();
            }

            if (stmtKind.attrs.at(0)?.ident === "c_function") {
                // No need to generate lir.
                continue;
            }

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

    private localOffsets = new Map<number, number>();
    private localRegs = new Map<number, Reg>();

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

        let currentOffset = 8 + this.fn.mir.paramLocals.size * 8;
        let frameSize = 0;

        for (const local of this.fn.mir.paramLocals.values()) {
            this.localOffsets.set(local.id, currentOffset);
            currentOffset -= 8;

            const reg = this.reg();
            this.pushIns({ tag: "alloc_param", reg, size: 8 });
        }
        // return address
        currentOffset -= 8;
        // old rbp
        currentOffset -= 8;
        // return value
        this.localOffsets.set(this.fn.mir.returnLocal.id, currentOffset);
        currentOffset -= 8;
        frameSize += 8;

        {
            const reg = this.reg();
            this.pushIns({ tag: "alloc_local", reg, size: 8 });
            this.localRegs.set(this.fn.mir.returnLocal.id, reg);
        }

        for (const local of this.fn.mir.locals) {
            if (this.localOffsets.has(local.id)) {
                continue;
            }
            this.localOffsets.set(local.id, currentOffset);
            currentOffset -= 8;
            frameSize += 8;
        }
        for (const local of this.fn.mir.locals) {
            if (this.localRegs.has(local.id)) {
                continue;
            }
            const reg = this.reg();
            this.pushIns({ tag: "alloc_local", reg, size: 8 });
            this.localRegs.set(local.id, reg);
        }

        if (frameSize % 16 !== 8) {
            frameSize += 8;
        }

        this.fn.frameSize = frameSize;
        this.fn.localOffsets = this.localOffsets;
        this.fn.localRegs = this.localRegs;

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
                    case "str": {
                        const reg = this.reg();
                        const stringId = this.strings.intern(k.val.val);
                        this.pushIns({ tag: "mov_string", reg, stringId });
                        this.pushIns({ tag: "push", reg });
                        this.pushIns({ tag: "kill", reg });
                        return;
                    }
                    case "int": {
                        const reg = this.reg();
                        this.pushIns({ tag: "mov_int", reg, val: k.val.val });
                        this.pushIns({ tag: "push", reg });
                        this.pushIns({ tag: "kill", reg });
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
                        this.pushIns({ tag: "kill", reg });
                        return;
                    }
                }
                const __: never = k.val;
                return;
            }
            case "pop": {
                const reg = this.reg();
                this.pushIns({ tag: "pop", reg });
                this.pushIns({ tag: "kill", reg });
                return;
            }
            case "load": {
                const reg = this.reg();
                const offset = this.localOffsets.get(k.local.id)!;
                this.pushIns({ tag: "load", reg, offset });
                this.pushIns({ tag: "push", reg });
                this.pushIns({ tag: "kill", reg });
                return;
            }
            case "store": {
                const reg = this.reg();
                const offset = this.localOffsets.get(k.local.id)!;
                this.pushIns({ tag: "pop", reg });
                this.pushIns({ tag: "store_reg", offset, reg });
                this.pushIns({ tag: "kill", reg });
                return;
            }
            case "call": {
                const reg = this.reg();
                this.pushIns({ tag: "pop", reg });
                this.pushIns({ tag: "call_reg", reg, args: k.args });
                this.pushIns({ tag: "kill", reg });
                return;
            }
            case "lt":
            case "eq":
            case "add":
            case "mul": {
                const src = this.reg();
                const dst = this.reg();
                this.pushIns({ tag: "pop", reg: src });
                this.pushIns({ tag: "pop", reg: dst });
                this.pushIns({ tag: k.tag, dst, src });
                this.pushIns({ tag: "push", reg: dst });
                this.pushIns({ tag: "kill", reg: src });
                this.pushIns({ tag: "kill", reg: dst });
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
                    target: this.blockLabels.get(k.truthy.id)!,
                });
                this.pushIns({ tag: "kill", reg });
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
