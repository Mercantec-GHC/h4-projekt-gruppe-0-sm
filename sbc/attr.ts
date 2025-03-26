import * as ast from "./ast.ts";

export class AttrView {
    public constructor(
        private attrs: ast.Attr[],
    ) {}

    public static fromStmt(stmt: ast.Stmt): AttrView {
        if (stmt.kind.tag !== "fn") {
            throw new Error("invalid statement");
        }
        return new AttrView(stmt.kind.attrs);
    }

    public has(ident: string): boolean {
        return this.attrs
            .some((attr) => attr.ident === ident);
    }

    public get(ident: string): OneAttrView {
        const attr = this.attrs
            .find((attr) => attr.ident === ident);
        if (!attr) {
            throw new Error("not found");
        }
        return new OneAttrView(attr);
    }
}

export class OneAttrView {
    public constructor(
        private attr: ast.Attr,
    ) {}

    public get args(): number {
        return this.attr.args.length;
    }

    public isStr(argIdx: number): boolean {
        return this.attr.args[argIdx].kind.tag === "str";
    }

    public strVal(argIdx: number): string {
        const arg = this.attr.args[argIdx];
        if (arg.kind.tag !== "str") {
            throw new Error("invalid argument expression");
        }
        return arg.kind.val;
    }
}
