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

    localRegs: Map<number, Reg>;
};

export type Line = {
    labels: Label[];
    ins: Ins;
};

export type Ins =
    | { tag: "error" }
    | { tag: "nop" }
    | { tag: "alloc_param"; reg: Reg; size: number }
    | { tag: "alloc_local"; reg: Reg; size: number }
    | { tag: "mov_int"; reg: Reg; val: number }
    | { tag: "mov_string"; reg: Reg; stringId: number }
    | { tag: "mov_fn"; reg: Reg; fn: Fn }
    | { tag: "push"; reg: Reg }
    | { tag: "pop"; reg: Reg }
    | { tag: "load"; reg: Reg; sReg: Reg }
    | { tag: "store_reg"; sReg: Reg; reg: Reg }
    | { tag: "store_imm"; sReg: Reg; val: number }
    | { tag: "call_reg"; reg: Reg; args: number }
    | { tag: "call_imm"; fn: Fn; args: number }
    | { tag: "jmp"; target: Label }
    | { tag: "jnz_reg"; reg: Reg; target: Label }
    | { tag: "ret" }
    | { tag: BinaryOp; dst: Reg; src: Reg }
    | { tag: "kill"; reg: Reg };

export type BinaryOp =
    | "lt"
    | "gt"
    | "le"
    | "ge"
    | "eq"
    | "ne"
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "mod";

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
            case "alloc_param":
                return `alloc_param %${ins.reg}, ${ins.size}`;
            case "alloc_local":
                return `alloc_local %${ins.reg}, ${ins.size}`;
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
                return `load %${ins.reg}, [%${ins.sReg}]`;
            case "store_reg":
                return `store_reg [%${ins.sReg}], %${ins.reg}`;
            case "store_imm":
                return `store_val [%${ins.sReg}], ${ins.val}`;
            case "call_reg":
                return `call_reg %${ins.reg}, ${ins.args}`;
            case "call_imm":
                return `call_fn ${ins.fn.label}, ${ins.args}`;
            case "jmp":
                return `jmp .L${ins.target}`;
            case "jnz_reg":
                return `jnz_reg %${ins.reg}, .L${ins.target}`;
            case "ret":
                return "ret";
            case "lt":
            case "gt":
            case "le":
            case "ge":
            case "eq":
            case "ne":
            case "add":
            case "sub":
            case "div":
            case "mul":
            case "mod":
                return `${ins.tag} %${ins.dst}, %${ins.src}`;
            case "kill":
                return `kill %${ins.reg}`;
        }
        const _: never = ins;
    }
}
