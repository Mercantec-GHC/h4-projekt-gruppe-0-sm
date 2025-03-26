import { AttrView } from "./attr.ts";
import * as lir from "./lir.ts";

export class AsmGen {
    private writer = new AsmWriter();

    private liveRegs = new Set<lir.Reg>();
    private regSelect = new Map<lir.Reg, string>();

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
        for (let i = 0; i < args; ++i) {
            this.writeIns(`mov rax, ${this.relative((i + 2) * 8)}`);
            this.writeIns(`push rax`);
        }

        const argRegs = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"];
        for (const reg of argRegs.slice(0, args + 1)) {
            this.writeIns(`pop ${reg}`);
        }

        this.writeIns(`call ${label}`);
        this.writeIns(`mov rsp, rbp`);
        this.writeIns(`pop rbp`);
        this.writeIns(`ret`);
    }

    private generateFnBody(fn: lir.Fn) {
        this.writeln(`${fn.label}:`);
        this.writeIns(`push rbp`);
        this.writeIns(`mov rbp, rsp`);
        this.writeIns(`sub rsp, ${fn.frameSize}`);
        this.writeIns(`jmp .L${fn.mir.entry.id}`);

        for (const line of fn.lines) {
            for (const label of line.labels) {
                this.writeln(`.L${label}:`);
            }
            this.generateIns(line.ins);
        }

        this.writeln(`.exit:`);
        const returnLocalOffset = fn.localOffsets.get(fn.mir.returnLocal.id)!;
        this.writeIns(`mov rax, QWORD ${this.relative(returnLocalOffset)}`);
        this.writeIns(`mov rsp, rbp`);
        this.writeIns(`pop rbp`);
        this.writeIns(`ret`);
    }

    private generateCExporter(fn: lir.Fn, label: string) {
        this.writeln(`global ${label}`);
        this.writeln(`${label}:`);

        this.writeIns(`push rbp`);
        this.writeIns(`mov rbp, rsp`);
        this.writeIns(`sub rsp, 8`);

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

    private generateIns(ins: lir.Ins) {
        const r = (reg: lir.Reg) => this.reg(reg);

        switch (ins.tag) {
            case "error":
                throw new Error();
            case "nop":
                this.writeIns(`nop`);
                return;
            case "alloc_param":
                // should already be handled
                return;
            case "alloc_local":
                // should already be handled
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
                    `mov ${r(ins.reg)}, QWORD ${this.relative(ins.offset)}`,
                );
                return;
            case "store_reg":
                this.writeIns(
                    `mov QWORD ${this.relative(ins.offset)}, ${r(ins.reg)}`,
                );
                return;
            case "store_imm":
                this.writeIns(
                    `mov QWORD ${this.relative(ins.offset)}, ${ins.val}`,
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
            case "eq":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`sete ${this.reg8(ins.dst)}`);
                return;
            case "add":
                this.writeIns(`add ${r(ins.dst)}, ${r(ins.src)}`);
                return;
            case "mul":
                this.writeIns(`imul ${r(ins.dst)}, ${r(ins.src)}`);
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

    private relative(offset: number): string {
        return `[rbp${offset >= 0 ? `+${offset}` : `${offset}`}]`;
    }

    private kill(reg: lir.Reg) {
        this.liveRegs.delete(reg);
        this.regSelect.delete(reg);
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
