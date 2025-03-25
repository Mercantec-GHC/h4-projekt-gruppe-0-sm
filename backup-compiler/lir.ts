import * as mir from "./mir.ts";

export type Program = {
    strings: Map<number, string>;
    fns: Fn[];
};

export type Fn = {
    id: number;
    label: string;
    mir: mir.Fn;
    lines: Line[];
    frameSize: number;
    localOffsets: Map<number, number>;
};

export type Line = {
    labels: Label[];
    ins: Ins;
};

export type Ins =
    | { tag: "error" }
    | { tag: "nop" }
    | { tag: "mov_int"; reg: Reg; val: number }
    | { tag: "mov_string"; reg: Reg; stringId: number }
    | { tag: "mov_fn"; reg: Reg; fn: Fn }
    | { tag: "push"; reg: Reg }
    | { tag: "pop"; reg: Reg }
    | { tag: "load"; reg: Reg; offset: number }
    | { tag: "store_reg"; offset: number; reg: Reg }
    | { tag: "store_imm"; offset: number; val: number }
    | { tag: "call_reg"; reg: Reg; args: number }
    | { tag: "call_imm"; fn: Fn; args: number }
    | { tag: "jmp"; target: Label }
    | { tag: "jnz_reg"; reg: Reg; target: Label }
    | { tag: "ret" }
    | { tag: "lt" | "eq" | "add" | "mul"; dst: Reg; src: Reg }
    | { tag: "kill"; reg: Reg };

export type Reg = number;
export type Label = number;

export class ProgramStringifyer {
    public constructor(
        private program: Program,
    ) {}

    public stringify(): string {
        return this.program.fns
            .map((fn) =>
                `${fn.label}:\n${
                    fn.lines
                        .map((label) =>
                            `${
                                label.labels
                                    .map((label) => `.L${label}:\n`)
                                    .join()
                            }    ${this.ins(label.ins)}\n`
                        )
                        .join("")
                }`
            )
            .join("");
    }

    private ins(ins: Ins): string {
        switch (ins.tag) {
            case "error":
                return "<error>";
            case "nop":
                return "nop";
            case "mov_int":
                return `mov_int %${ins.reg}, ${ins.val}`;
            case "mov_string":
                return `mov_string %${ins.reg}, string+${ins.stringId}`;
            case "mov_fn":
                return `mov_fn %${ins.reg}, ${ins.fn.label}`;
            case "push":
                return `push %${ins.reg}`;
            case "pop":
                return `pop %${ins.reg}`;
            case "load":
                return `load %${ins.reg}, ${ins.offset}`;
            case "store_reg":
                return `store_reg ${ins.offset}, %${ins.reg}`;
            case "store_imm":
                return `store_val ${ins.offset}, ${ins.val}`;
            case "call_reg":
                return `call_reg %${ins.reg}, ${ins.args}`;
            case "call_imm":
                return `call_fn ${ins.fn.label}, ${ins.args}`;
            case "jmp":
                return `jmp .b${ins.target}`;
            case "jnz_reg":
                return `jmp %${ins.reg}, .b${ins.target}`;
            case "ret":
                return "ret";
            case "lt":
            case "eq":
            case "add":
            case "mul":
                return `${ins.tag} %${ins.dst}, %${ins.src}`;
            case "kill":
                return `kill %${ins.reg}`;
        }
        const _: never = ins;
    }
}
