import { Ty, tyToString } from "./ty.ts";
import * as ast from "./ast.ts";

export type Fn = {
    stmt: ast.Stmt;
    locals: Local[];
    paramLocals: Map<number, Local>;
    returnLocal: Local;

    blocks: Block[];
    entry: Block;
    exit: Block;
};

export type Block = {
    id: number;
    stmts: Stmt[];
    ter: Ter;
};

export type Local = {
    id: number;
    ty: Ty;
    ident?: string;
    stmt?: ast.Stmt;
};

export type Stmt = {
    kind: StmtKind;
};

export const Stmt = (kind: StmtKind): Stmt => ({ kind });

export type StmtKind =
    | { tag: "error" }
    | { tag: "push"; val: Val; ty: Ty }
    | { tag: "pop" }
    | { tag: "load"; local: Local }
    | { tag: "store"; local: Local }
    | { tag: "call"; args: number }
    | { tag: "lt" | "eq" | "add" | "mul" };

export type Ter = {
    kind: TerKind;
};
export const Ter = (kind: TerKind): Ter => ({ kind });

export type TerKind =
    | { tag: "error" }
    | { tag: "unset" }
    | { tag: "return" }
    | { tag: "goto"; target: Block }
    | {
        tag: "if";
        truthy: Block;
        falsy: Block;
    };

export type Val =
    | { tag: "int"; val: number }
    | { tag: "string"; val: string }
    | { tag: "fn"; stmt: ast.Stmt };

export class FnStringifyer {
    public constructor(
        private fn: Fn,
    ) {}

    public stringify(): string {
        const kind = this.fn.stmt.kind;
        if (kind.tag !== "fn") {
            throw new Error();
        }
        return `${kind.ident}:\n${
            this.fn.locals
                .map((local) => `    %${local.id}: ${tyToString(local.ty)}\n`)
                .join("")
        }${
            this.fn.blocks
                .map((block) =>
                    `    .b${block.id}:\n${
                        block.stmts
                            .map((stmt) => `        ${this.stmt(stmt)}\n`)
                            .join("")
                    }        ${this.ter(block.ter)}\n`
                )
                .join("")
        }`;
    }

    private stmt(stmt: Stmt): string {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                return "<error>";
            case "push":
                return `push (${tyToString(k.ty)}) ${this.val(k.val)}`;
            case "pop":
                return "pop";
            case "load":
                return `load %${k.local.id}`;
            case "store":
                return `store %${k.local.id}`;
            case "call":
                return `call ${k.args}`;
            case "lt":
            case "eq":
            case "add":
            case "mul":
                return k.tag;
        }
    }

    private ter(ter: Ter): string {
        const k = ter.kind;
        switch (k.tag) {
            case "error":
                return "<error>";
            case "unset":
                return "<unset>";
            case "return":
                return "return";
            case "goto":
                return `goto .b${k.target.id}`;
            case "if":
                return `goto .b${k.truthy.id}, .b${k.falsy.id}`;
        }
    }

    private val(val: Val): string {
        switch (val.tag) {
            case "string":
                return JSON.stringify(val.val);
            case "int":
                return `${val.val}`;
            case "fn":
                if (val.stmt.kind.tag !== "fn") {
                    throw new Error();
                }
                return val.stmt.kind.ident;
        }
    }
}
