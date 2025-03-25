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
            this.writeln(`align 8`);
            this.writeln(`global ${fn.label}:`);
            this.writeln(`${fn.label}:`);

            this.generateFnBody(fn);
        }

        return this.writer.finalize();
    }

    private generateFnBody(fn: lir.Fn) {
        const stmtKind = fn.mir.stmt.kind;
        if (stmtKind.tag !== "fn") {
            throw new Error();
        }
        if (stmtKind.attrs.at(0)?.ident === "c_function") {
            const arg = stmtKind.attrs.at(0)!.args.at(0);
            if (!arg || arg.kind.tag !== "string") {
                throw new Error("incorrect args for attribute");
            }
            const label = arg.kind.val;
            this.generateCFunctionBody(label, fn.mir.paramLocals.size);
            return;
        }

        this.writeIns(`push r12`);
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
        this.writeIns(`mov rsp, rbp`);
        this.writeIns(`pop rbp`);
        this.writeIns(`pop r12`);
    }

    private generateCFunctionBody(label: string, args: number) {
        const argRegs = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"];
        const returnReg = "rax";
        if (args > argRegs.length) {
            throw new Error(
                `arg count (${args}) > ${argRegs.length} not supported`,
            );
        }
        this.writeIns(`push ${returnReg}`);
        for (const reg of argRegs.slice(0, args + 1)) {
            this.writeIns(`push ${reg}`);
        }
        this.writeIns(`call ${label}`);
        this.writeIns(`mov r12, rax`);
        for (const reg of argRegs.slice(0, args + 1).toReversed()) {
            this.writeIns(`push ${reg}`);
        }
        this.writeIns(`pop ${returnReg}`);
        this.writeIns(`push r12`);
    }

    private generateIns(ins: lir.Ins) {
        const r = (reg: lir.Reg) => this.reg(reg);

        switch (ins.tag) {
            case "error":
                throw new Error();
            case "nop":
                this.writeIns(`nop`);
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
                this.writeIns(`mov QWORD [rbp${ins.offset}], ${r(ins.reg)}`);
                return;
            case "store":
                this.writeIns(`mov ${r(ins.reg)}, QWORD [rbp${ins.offset}]`);
                return;
            case "call_reg":
                this.generateCall(r(ins.reg), ins.args);
                return;
            case "call_fn":
                this.generateCall(ins.fn.label, ins.args);
                return;
            case "jmp":
                this.writeIns(`jmp .L${ins.target}`);
                return;
            case "jnz_reg":
                this.writeIns(`jnz ${r(ins.reg)}, .L${ins.target}`);
                return;
            case "ret":
                this.writeIns(`jmp .exit`);
                return;
            case "lt":
                this.writeIns(`cmp ${r(ins.dst)}, ${r(ins.src)}`);
                this.writeIns(`setle ${this.reg8(ins.dst)}`);
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
    }

    private generateCall(value: string, args: number) {
        const argRegs = ["rdi", "rsi", "rdx", "rcx", "r8", "r9"];
        const returnReg = "rax";
        if (args > argRegs.length) {
            throw new Error(
                `arg count (${args}) > ${argRegs.length} not supported`,
            );
        }
        this.writeIns(`push ${returnReg}`);
        for (const reg of argRegs.slice(0, args + 1)) {
            this.writeIns(`push ${reg}`);
        }
        this.writeIns(`call ${value}`);
        this.writeIns(`mov r12, rax`);
        for (const reg of argRegs.slice(0, args + 1).toReversed()) {
            this.writeIns(`push ${reg}`);
        }
        this.writeIns(`pop ${returnReg}`);
        this.writeIns(`push r12`);
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
            this.liveRegs.add(reg);
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
            this.regSelect.set(reg, regSel);
        }
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
