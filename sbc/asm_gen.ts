import { AttrView } from "./attr.ts";
import * as lir from "./lir.ts";

export class AsmGen {
    private writer = new AsmWriter();

    private liveRegs = new Set<lir.Reg>();
    private regSelect = new Map<lir.Reg, string>();

    private layout!: StackLayout;

    public constructor(
        private lir: lir.Program,
    ) {}

    public generate(): string {
        this.writeln(`bits 64`);
        this.writeln(`section .data`);
        for (const [id, val] of this.lir.strings) {
            this.writeln(`align 8`);
            this.writeln(`sbc__string_${id}:`);
            this.writeIns(`dq ${val.length}`);
            const escaped = val
                .replaceAll('"', '\\"')
                .replaceAll("\n", "\\n")
                .replaceAll("\t", "\\t");
            this.writeIns(`db "${escaped}"`);
        }
        this.writeln(`section .text`);

        for (const fn of this.lir.fns) {
            this.generateFn(fn);
        }

        this.writeln(`sbc__div:`);
        this.writeIns(`mov rax, [rsp+16]`);
        this.writeIns(`mov rdi, [rsp+8]`);
        this.writeIns(`cqo`);
        this.writeIns(`idiv rdi`);
        this.writeIns(`ret`);
        this.writeln(`sbc__mod:`);
        this.writeIns(`mov rax, [rsp+16]`);
        this.writeIns(`mov rdi, [rsp+8]`);
        this.writeIns(`cqo`);
        this.writeIns(`idiv rdi`);
        this.writeIns(`mov rax, rdx`);
        this.writeIns(`ret`);

        this.writeln(`; vim: syntax=nasm commentstring=;\\ %s`);
        this.writeln("");
        return this.writer.finalize();
    }

    private generateFn(fn: lir.Fn) {
        const cFunctionQuery = this.queryCFunction(fn);
        if (cFunctionQuery.found) {
            const { label, args } = cFunctionQuery;
            this.generateCFunctionBody(fn, label, args);
            return;
        }

        this.generateFnBody(fn);

        const cExportQuery = this.queryCExport(fn);
        if (cExportQuery.found) {
            const { label } = cExportQuery;
            this.generateCExporter(fn, label);
        }
    }

    private queryCFunction(
        fn: lir.Fn,
    ): { found: false } | { found: true; label: string; args: number } {
        const attrs = AttrView.fromStmt(fn.mir.stmt);
        if (attrs.has("c_function")) {
            const attr = attrs.get("c_function");
            if (attr.args !== 1 || !attr.isStr(0)) {
                throw new Error("incorrect args for attribute");
            }
            return {
                found: true,
                label: attr.strVal(0),
                args: fn.mir.paramLocals.size,
            };
        }
        return { found: false };
    }

    private queryCExport(
        fn: lir.Fn,
    ): { found: false } | { found: true; label: string } {
        const attrs = AttrView.fromStmt(fn.mir.stmt);
        if (attrs.has("c_export")) {
            const attr = attrs.get("c_export");
            if (attr.args !== 1 || !attr.isStr(0)) {
                throw new Error("incorrect args for attribute");
            }
            const label = attr.strVal(0);
            return { found: true, label };
        }
        return { found: false };
    }

    private generateCFunctionBody(fn: lir.Fn, label: string, args: number) {
        this.writeln(`extern ${label}`);
        this.writeln(`${fn.label}:`);

        this.writeIns(`push rbp`);
        this.writeIns(`mov rbp, rsp`);
        this.writeIns(`sub rsp, 8`);

        // By doing this, we avoid having to maintain 16-byte stack alignment.
        this.writeIns(`and rsp, 0xFFFFFFFFFFFFFFF0`);

        for (let i = 0; i < args; ++i) {
            this.writeIns(`mov rax, ${this.relative((i + 2) * 8)}`);
            this.writeIns(`push rax`);
        }

        const argRegs = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"];
        for (const reg of argRegs.slice(0, args)) {
            this.writeIns(`pop ${reg}`);
        }

        this.writeIns(`call ${label}`);
        this.writeIns(`mov rsp, rbp`);
        this.writeIns(`pop rbp`);
        this.writeIns(`ret`);
    }

    private generateCExporter(fn: lir.Fn, label: string) {
        this.writeln(`global ${label}`);
        this.writeln(`${label}:`);

        this.writeIns(`push rbp`);
        this.writeIns(`mov rbp, rsp`);

        const args = fn.mir.paramLocals.size;

        const argRegs = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"];
        for (const reg of argRegs.slice(0, args)) {
            this.writeIns(`push ${reg}`);
        }

        this.writeIns(`call ${fn.label}`);

        this.writeIns(`mov rsp, rbp`);
        this.writeIns(`pop rbp`);
        this.writeIns(`ret`);
    }

    private generateFnBody(fn: lir.Fn) {
        let bodyIdx = 0;
        const allocator = new StackAllocator();
        for (const [i, { ins }] of fn.lines.entries()) {
            if (ins.tag === "alloc_param") {
                allocator.allocParam(ins.reg, ins.size);
            } else if (ins.tag === "alloc_local") {
                allocator.allocLocal(ins.reg, ins.size);
            } else {
                bodyIdx = i;
                break;
            }
        }
        this.layout = allocator.finalize();

        const returnLocalOffset = this.layout
            .offset(fn.localRegs.get(fn.mir.returnLocal.id)!);

        this.writeln(`${fn.label}:`);
        this.writeIns(`push rbp`);
        this.writeIns(`mov rbp, rsp`);

        this.writeIns(`sub rsp, ${this.layout.frameSize}`);
        this.writeIns(`jmp .L${fn.mir.entry.id}`);

        for (const line of fn.lines.slice(bodyIdx)) {
            for (const label of line.labels) {
                this.writeln(`.L${label}:`);
            }
            this.generateIns(line.ins);
        }

        this.writeln(`.exit:`);
        this.writeIns(`mov rax, QWORD ${this.relative(returnLocalOffset)}`);
        this.writeIns(`mov rsp, rbp`);
        this.writeIns(`pop rbp`);
        this.writeIns(`ret`);
    }

    private generateIns(ins: lir.Ins) {
        const r = (reg: lir.Reg) => this.reg(reg);

        switch (ins.tag) {
            case "error":
                throw new Error();
            case "nop":
                this.writeIns(`nop`);
                return;
            case "alloc_param":
            case "alloc_local":
                // Handled elsewhere.
                return;
            case "mov_int":
                this.writeIns(`mov ${r(ins.reg)}, ${ins.val}`);
                return;
            case "mov_string":
                this.writeIns(`mov ${r(ins.reg)}, sbc__string_${ins.stringId}`);
                return;
            case "mov_fn":
                this.writeIns(`mov ${r(ins.reg)}, ${ins.fn.label}`);
                return;
            case "push":
                this.writeIns(`push ${r(ins.reg)}`);
                return;
            case "pop":
                this.writeIns(`pop ${r(ins.reg)}`);
                return;
            case "load":
                this.writeIns(
                    `mov ${r(ins.reg)}, QWORD ${
                        this.relative(this.layout.offset(ins.sReg))
                    }`,
                );
                return;
            case "store_reg":
                this.writeIns(
                    `mov QWORD ${
                        this.relative(this.layout.offset(ins.sReg))
                    }, ${r(ins.reg)}`,
                );
                return;
            case "store_imm":
                this.writeIns(
                    `mov QWORD ${
                        this.relative(this.layout.offset(ins.sReg))
                    }, ${ins.val}`,
                );
                return;
            case "call_reg":
                this.writeIns(`call ${r(ins.reg)}`);
                this.writeIns(`push rax`);
                return;
            case "call_imm":
                this.writeIns(`call ${ins.fn.label}`);
                this.writeIns(`push rax`);
                return;
            case "jmp":
                this.writeIns(`jmp .L${ins.target}`);
                return;
            case "jnz_reg":
                this.writeIns(`cmp ${r(ins.reg)}, 0`);
                this.writeIns(`jne .L${ins.target}`);
                return;
            case "ret":
                this.writeIns(`jmp .exit`);
                return;
            case "lt":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`setl ${this.reg8(ins.dst)}`);
                return;
            case "gt":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`setg ${this.reg8(ins.dst)}`);
                return;
            case "le":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`setle ${this.reg8(ins.dst)}`);
                return;
            case "ge":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`setge ${this.reg8(ins.dst)}`);
                return;
            case "eq":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`sete ${this.reg8(ins.dst)}`);
                return;
            case "ne":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`setne ${this.reg8(ins.dst)}`);
                return;
            case "add":
                this.writeIns(`add ${r(ins.dst)}, ${r(ins.src)}`);
                return;
            case "sub":
                this.writeIns(`sub ${r(ins.dst)}, ${r(ins.src)}`);
                return;
            case "mul":
                this.writeIns(`imul ${r(ins.dst)}, ${r(ins.src)}`);
                return;
            case "div":
                this.writeIns(`push ${r(ins.dst)}`);
                this.writeIns(`push ${r(ins.src)}`);
                this.writeIns(`call sbc__div`);
                this.writeIns(`mov ${r(ins.dst)}, rax`);
                return;
            case "mod":
                this.writeIns(`push ${r(ins.dst)}`);
                this.writeIns(`push ${r(ins.src)}`);
                this.writeIns(`call sbc__mod`);
                this.writeIns(`mov ${r(ins.dst)}, rax`);
                return;
            case "kill":
                this.kill(ins.reg);
                return;
        }
        const _: never = ins;
    }

    private reg(reg: lir.Reg): string {
        this.allocReg(reg);
        return this.regSelect.get(reg)!;
    }

    private reg8(reg: lir.Reg): string {
        this.allocReg(reg);
        return {
            "rax": "al",
            "rdi": "dil",
            "rsi": "sil",
            "rdx": "dl",
            "rcx": "cl",
            "r8": "r8b",
            "r9": "r9b",
            "r10": "r10b",
            "r11": "r11b",
        }[this.regSelect.get(reg)!]!;
    }

    private allocReg(reg: lir.Reg) {
        if (!this.liveRegs.has(reg)) {
            const regSel = [
                "rax",
                "rdi",
                "rsi",
                "rdx",
                "rcx",
                "r8",
                "r9",
                "r10",
                "r11",
            ].at(this.liveRegs.size);
            if (!regSel) {
                throw new Error("ran out of registers");
            }
            this.liveRegs.add(reg);
            this.regSelect.set(reg, regSel);
        }
    }

    private kill(reg: lir.Reg) {
        this.liveRegs.delete(reg);
        this.regSelect.delete(reg);
    }

    private relative(offset: number): string {
        return `[rbp${offset >= 0 ? `+${offset}` : `${offset}`}]`;
    }

    private writeIns(ins: string) {
        this.writer.writeln(`    ${ins}`);
    }

    private writeln(line: string) {
        this.writer.writeln(line);
    }
}

class AsmWriter {
    private result = "";

    public writeln(line: string) {
        this.result += `${line}\n`;
    }

    public finalize(): string {
        return this.result;
    }
}

class StackLayout {
    public constructor(
        public readonly frameSize: number,
        private regOffsets: Map<lir.Reg, number>,
    ) {}

    public offset(reg: lir.Reg): number {
        const offset = this.regOffsets.get(reg);
        if (!offset) {
            throw new Error("not found");
        }
        return offset;
    }
}

class StackAllocator {
    private paramRegs = new Map<lir.Reg, number>();
    private localRegs = new Map<lir.Reg, number>();

    public allocParam(reg: lir.Reg, size: number) {
        this.paramRegs.set(reg, size);
    }
    public allocLocal(reg: lir.Reg, size: number) {
        this.localRegs.set(reg, size);
    }

    public finalize(): StackLayout {
        const regOffsets = new Map<lir.Reg, number>();

        // Last param is at [rbp+8]
        // See: https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64
        let currentOffset = 8;

        for (const [reg, size] of [...this.paramRegs].toReversed()) {
            // Parameters are by convention 8-byte aligned.
            currentOffset += align8(size);
            regOffsets.set(reg, currentOffset);
        }

        // First local is at [rbp-8]
        // See above.
        currentOffset = -8;
        let frameSize = 0;

        for (const [reg, size] of this.localRegs) {
            regOffsets.set(reg, currentOffset);
            currentOffset -= align8(size);
            frameSize += align8(size);
        }

        return new StackLayout(frameSize, regOffsets);
    }
}

const align = (value: number, alignment: number): number =>
    value % alignment === 0 ? value : value + (alignment - value % alignment);
const align8 = (value: number): number => align(value, 8);
