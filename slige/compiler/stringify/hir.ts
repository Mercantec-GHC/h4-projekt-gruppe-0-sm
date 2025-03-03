import * as ast from "@slige/ast";
import { Ctx, exhausted, todo } from "@slige/common";
import { Checker } from "@slige/check";
import { Ty, tyToString } from "@slige/ty";

export class HirStringifyer {
    public constructor(
        private ctx: Ctx,
        private ch: Checker,
    ) {}

    public file(file: ast.File, depth = 0): string {
        return file.stmts.map((stmt) =>
            indent(depth) + this.stmt(stmt, depth + 1)
        ).join("\n");
    }

    public stmt(stmt: ast.Stmt, d = 0): string {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                return "<error>;";
            case "item":
                return this.item(k.item);
            case "let": {
                return `let ${this.pat(k.pat, d)}${
                    k.expr && ` = ${this.expr(k.expr, d)}` || ""
                };`;
            }
            case "return":
                return `return${k.expr && ` ${this.expr(k.expr, d)}` || ""};`;
            case "break":
                return `break${k.expr && ` ${this.expr(k.expr, d)}` || ""};`;
            case "continue":
                return `continue;`;
            case "assign":
                return `${this.expr(k.subject, d)} ${k.assignType} ${
                    this.expr(k.value, d)
                };`;
            case "expr":
                return `${this.expr(k.expr, d)};`;
        }
        exhausted(k);
    }

    public item(item: ast.Item, d = 0): string {
        const ident = item.ident.text;
        const pub = item.pub ? "pub " : "";
        const k = item.kind;
        switch (k.tag) {
            case "error":
                return "<error>;";
            case "mod_block":
                return `${pub}mod ${ident} ${this.block(k.block, d)}`;
            case "mod_file":
                return `${pub}mod ${ident} {\n${this.file(k.ast!, d + 1)}\n}`;
            case "enum":
                return `enum ${ident}: ${
                    this.ty(this.ch.enumItemTy(item, k))
                };`;
            case "struct":
                return `struct ${ident}: ${
                    this.ty(this.ch.structItemTy(item, k))
                };`;
            case "fn": {
                const ty = this.ch.fnItemTy(item, k);
                if (ty.kind.tag !== "fn") {
                    throw new Error();
                }
                const params = k.params
                    .map((param) => this.pat(param.pat, d))
                    .join(", ");
                return `${pub}fn ${ident}(${params}) -> ${
                    this.ty(ty.kind.returnTy)
                } ${this.block(k.body!, d)}`;
            }
            case "use":
                return todo();
            case "type_alias":
                return todo();
        }
        exhausted(k);
    }

    public expr(expr: ast.Expr, d: number): string {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                return "<error>";
            case "path":
                return this.path(k.path);
            case "null":
                return "null";
            case "int":
                return `${k.value}`;
            case "bool":
                return `${k.value}`;
            case "str":
                return `"${k.value}"`;
            case "group":
            case "array":
            case "repeat":
                return todo(k.tag);
            case "struct":
                return `${k.path ? `${this.path(k.path)}` : "struct "} {${
                    [
                        k.fields
                            .map((field) =>
                                `${indent(d + 1)}${field.ident.text}: ${
                                    this.expr(field.expr, d + 1)
                                },`
                            )
                            .join("\n"),
                    ].map((s) => `\n${s}\n${indent(d)}`)
                }}`;
            case "ref":
            case "deref":
            case "elem":
            case "field":
            case "index":
                return todo(k.tag);
            case "call":
                return `${this.expr(k.expr, d)}(${
                    k.args.map((arg) => this.expr(arg, d)).join(", ")
                })`;
            case "unary":
                return todo(k.tag);
            case "binary":
                return `${this.expr(k.left, d)} ${k.binaryType} ${
                    this.expr(k.right, d)
                }`;
            case "block":
                return this.block(k.block, d);
            case "if":
                return `if ${this.expr(k.cond, d)} ${this.expr(k.truthy, d)}${
                    k.falsy && ` else ${this.expr(k.falsy, d)}` || ""
                }`;
            case "match":
                return `match ${this.expr(k.expr, d)} ${
                    k.arms.length === 0 ? "{}" : `{${
                        k.arms
                            .map((arm) => this.matchArm(arm, d + 1))
                            .map((s) =>
                                `\n${indent(d + 1)}${s},`
                            )
                            .join("")
                    }\n${indent(d)}}`
                }`;
            case "loop":
                return `loop ${this.expr(k.body, d)}`;
            case "while":
                return `while ${this.expr(k.cond, d)} ${this.expr(k.body, d)}`;
            case "for":
                return todo(k.tag);
            case "c_for":
                return `for (${k.decl && this.stmt(k.decl, d) || ";"}${
                    k.cond && ` ${this.expr(k.cond, d)}` || ""
                };${k.incr && ` ${this.stmt(k.incr, d)}` || ""}) ${
                    this.expr(k.body, d)
                }`;
        }
        exhausted(k);
    }

    public matchArm(arm: ast.MatchArm, d: number): string {
        return `${this.pat(arm.pat, d)} => ${this.expr(arm.expr, d)}`;
    }

    public pat(pat: ast.Pat, d: number): string {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return "<error>";
            case "bind":
                return `${k.mut ? "mut " : ""}${k.ident.text}: ${
                    this.ty(this.ch.patTy(pat))
                }`;
            case "path":
                return this.path(k.path);
            case "tuple":
                return `${k.path && this.path(k.path) || ""}(${
                    k.elems.map((pat) => this.pat(pat, d)).join(", ")
                })`;
            case "struct":
                return `${k.path ? `${this.path(k.path)}` : "struct "} {${
                    [
                        k.fields
                            .map((field) =>
                                `${indent(d + 1)}${field.ident.text}: ${
                                    this.pat(field.pat, d + 1)
                                },`
                            )
                            .join("\n"),
                    ].map((s) => `\n${s}\n${indent(d)}`)
                }}`;
        }
        exhausted(k);
    }

    public block(block: ast.Block, d: number): string {
        if (block.stmts.length === 0 && !block.expr) {
            return "{}";
        }
        return `{\n${
            [
                ...block.stmts
                    .map((stmt) => this.stmt(stmt, d + 1)),
                ...(block.expr ? [this.expr(block.expr, d + 1)] : []),
            ]
                .map((str) => indent(d + 1) + str)
                .join("\n")
        }\n${indent(d)}}`;
    }

    public path(path: ast.Path): string {
        return path.segments
            .map((seg) => seg.ident.text)
            .join("::");
    }

    public ty(ty: Ty): string {
        return tyToString(this.ctx, ty);
    }
}

function indent(depth: number): string {
    return "    ".repeat(depth);
}
