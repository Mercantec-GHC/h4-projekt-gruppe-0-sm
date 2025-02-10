import * as ast from "@slige/ast";
import {
    AstId,
    Ctx,
    exhausted,
    File,
    IdMap,
    IdSet,
    Ok,
    Res,
    Span,
    todo,
} from "@slige/common";
import * as resolve from "@slige/resolve";
import { Ty, tyToString } from "@slige/ty";

export class Checker {
    private stmtChecked = new IdSet<AstId>();
    private itemTys = new IdMap<AstId, Ty>();
    private exprTys = new IdMap<AstId, Ty>();
    private tyTys = new IdMap<AstId, Ty>();
    private patTys = new IdMap<AstId, Ty>();

    private currentFile: File;

    public constructor(
        private ctx: Ctx,
        private entryFileAst: ast.File,
        private re: resolve.Resols,
    ) {
        this.currentFile = ctx.entryFile();
    }

    private checkBlock(block: ast.Block, expected: Ty): Ty {
        this.checkStmts(block.stmts);
        return block.expr &&
                this.checkExpr(block.expr, expected) ||
            Ty({ tag: "null" });
    }

    private checkStmts(stmts: ast.Stmt[]) {
    }

    private checkLetStmtTy(stmt: ast.Stmt, kind: ast.LetStmt) {
        if (this.stmtChecked.has(stmt.id)) {
            return;
        }

        const exprTy = kind.expr && Ok(this.exprTy(kind.expr));
        const tyTy = kind.ty && Ok(this.tyTy(kind.ty));
        const ty = exprTy !== undefined && tyTy !== undefined
            ? this.resolveTys(exprTy.val, tyTy.val)
            : exprTy || tyTy;

        this.stmtChecked.add(stmt.id);

        if (ty === undefined) {
            this.assignPatTy(kind.pat, Ty({ tag: "error" }));
            this.report("type amfibious, specify type or value", stmt.span);
            return Ty({ tag: "error" });
        }

        if (!ty.ok) {
            this.assignPatTy(kind.pat, Ty({ tag: "error" }));
            this.report(ty.val, stmt.span);
            return Ty({ tag: "error" });
        }

        const res = this.assignPatTy(kind.pat, ty.val);
        if (!res.ok) {
            this.report(res.val, stmt.span);
            return Ty({ tag: "error" });
        }
    }

    private assignPatTy(pat: ast.Pat, ty: Ty): Res<void, string> {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                // don't report, already reported
                return Res.Ok(undefined);
            case "bind":
                this.patTys.set(pat.id, ty);
                return Ok(undefined);
            case "path":
                return todo();
        }
        exhausted(k);
    }

    public fnItemTy(item: ast.Item, kind: ast.FnItem): Ty {
        return this.itemTys.get(item.id) ?? this.checkFnItem(item, kind);
    }

    private checkFnItem(item: ast.Item, kind: ast.FnItem): Ty {
        const params = kind.params.map((param) => this.tyTy(param.ty));
        const returnTy = kind.returnTy && this.tyTy(kind.returnTy) ||
            Ty({ tag: "null" });
        return Ty({ tag: "fn", item, kind, params, returnTy });
    }

    public exprTy(expr: ast.Expr): Ty {
        return this.exprTys.get(expr.id) ||
            this.checkExpr(expr, Ty({ tag: "unknown" }));
    }

    private checkExpr(expr: ast.Expr, expected: Ty): Ty {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                return Ty({ tag: "error" });
            case "path":
                return this.checkPathExpr(expr, k, expected);
            case "null":
                return Ty({ tag: "null" });
            case "int":
                return Ty({ tag: "int" });
            case "bool":
                return Ty({ tag: "bool" });
            case "str":
                return todo();
            case "group":
                return todo();
            case "array":
                return todo();
            case "repeat":
                return todo();
            case "struct":
                return todo();
            case "ref":
                return todo();
            case "deref":
                return todo();
            case "elem":
                return todo();
            case "field":
                return todo();
            case "index":
                return todo();
            case "call":
                return this.checkCallExpr(expr, k, expected);
            case "unary":
                return todo();
            case "binary":
                return this.checkBinaryExpr(expr, k, expected);
            case "block":
                return this.checkBlock(k.block, expected);
            case "if":
                return this.checkIfExpr(expr, k, expected);
            case "loop":
                return todo();
            case "while":
                return todo();
            case "for":
                return todo();
            case "c_for":
                return todo();
        }
        exhausted(k);
    }

    private checkPathExpr(
        expr: ast.Expr,
        kind: ast.PathExpr,
        expected: Ty,
    ): Ty {
        const res = this.re.exprRes(expr.id);
        switch (res.kind.tag) {
            case "error":
                return Ty({ tag: "error" });
            case "fn": {
                const fn = res.kind.item;
                const ty = this.fnItemTy(fn, res.kind.kind);
                const resu = this.resolveTys(ty, expected);
                if (!resu.ok) {
                    this.report(resu.val, expr.span);
                    return Ty({ tag: "error" });
                }
                return resu.val;
            }
            case "local": {
                const patRes = this.re.patRes(res.kind.id);
                const ty = this.patTy(patRes.pat);
                const resu = this.resolveTys(ty, expected);
                if (!resu.ok) {
                    this.report(resu.val, expr.span);
                    return Ty({ tag: "error" });
                }
                return resu.val;
            }
        }
        exhausted(res.kind);
    }

    private checkCallExpr(
        expr: ast.Expr,
        kind: ast.CallExpr,
        expected: Ty,
    ): Ty {
        const fnTy = this.exprTy(kind.expr);
        if (fnTy.kind.tag !== "fn") {
            if (fnTy.kind.tag === "error") {
                return fnTy;
            }
            const ty = tyToString(this.ctx, fnTy);
            console.log(kind.expr.span);
            this.report(`type '${ty}' not fucking callable`, kind.expr.span);
            return Ty({ tag: "error" });
        }
        const paramTys = fnTy.kind.params;
        if (paramTys.length !== kind.args.length) {
            this.report(
                "not enough/too many fucking arguments",
                kind.expr.span,
            );
            return Ty({ tag: "error" });
        }
        for (const [i, arg] of kind.args.entries()) {
            this.checkExpr(arg, paramTys[i]);
        }

        const ty = fnTy.kind.returnTy;
        this.exprTys.set(expr.id, ty);
        return ty;
    }

    private checkBinaryExpr(
        expr: ast.Expr,
        kind: ast.BinaryExpr,
        expected: Ty,
    ): Ty {
        switch (kind.binaryType) {
            case "+":
            case "-":
            case "*":
            case "/": {
                const operandRes = this.resolveTys(
                    this.exprTy(kind.left),
                    this.exprTy(kind.right),
                );
                if (!operandRes.ok) {
                    this.exprTys.set(expr.id, Ty({ tag: "error" }));
                    this.report(operandRes.val, expr.span);
                    return Ty({ tag: "error" });
                }
                const operatorRes = this.resolveTys(
                    operandRes.val,
                    Ty({ tag: "int" }),
                );
                if (!operatorRes.ok) {
                    this.exprTys.set(expr.id, Ty({ tag: "error" }));
                    this.report(operatorRes.val, expr.span);
                    return Ty({ tag: "error" });
                }
                this.exprTys.set(expr.id, operatorRes.val);
                return operandRes.val;
            }
            case "==":
            case "!=":
            case "<":
            case ">":
            case "<=":
            case ">=":
            case "or":
            case "and": {
                const operandRes = this.resolveTys(
                    this.exprTy(kind.left),
                    this.exprTy(kind.right),
                );
                if (!operandRes.ok) {
                    this.exprTys.set(expr.id, Ty({ tag: "error" }));
                    this.report(operandRes.val, expr.span);
                    return Ty({ tag: "error" });
                }
                const ty = Ty({ tag: "bool" });
                this.exprTys.set(expr.id, ty);
                return ty;
            }
        }
    }

    private checkIfExpr(
        expr: ast.Expr,
        kind: ast.IfExpr,
        expected: Ty,
    ): Ty {
        const cond = this.exprTy(kind.cond);
        const condRes = this.resolveTys(cond, Ty({ tag: "bool" }));
        if (!condRes.ok) {
            this.exprTys.set(expr.id, Ty({ tag: "error" }));
            this.report("if-condition must be a boolean", kind.cond.span);
            return Ty({ tag: "error" });
        }
        const truthy = this.exprTy(kind.truthy);
        if (!kind.falsy) {
            const truthyRes = this.resolveTys(
                truthy,
                Ty({ tag: "null" }),
            );
            if (!truthyRes.ok) {
                this.exprTys.set(expr.id, Ty({ tag: "error" }));
                this.report(
                    "if there isn't a falsy-clause, then the truthy clause must evaluate to null",
                    kind.truthy.span,
                );
                return Ty({ tag: "error" });
            }
            this.exprTys.set(expr.id, Ty({ tag: "null" }));
            return Ty({ tag: "null" });
        }
        const falsy = this.exprTy(kind.falsy);
        const bothRes = this.resolveTys(truthy, falsy);
        if (!bothRes.ok) {
            this.exprTys.set(expr.id, Ty({ tag: "error" }));
            this.report(bothRes.val, kind.truthy.span);
            return Ty({ tag: "error" });
        }
        this.exprTys.set(expr.id, bothRes.val);
        return bothRes.val;
    }

    private tyTy(ty: ast.Ty): Ty {
        return this.tyTys.get(ty.id) ||
            this.checkTy(ty);
    }

    private checkTy(ty: ast.Ty): Ty {
        const k = ty.kind;
        switch (k.tag) {
            case "error":
                return Ty({ tag: "error" });
            case "null":
            case "int":
                return Ty({ tag: "int" });
            case "bool":
            case "str":
            case "path":
            case "ref":
            case "ptr":
            case "slice":
            case "array":
            case "anon_struct":
                return todo(k);
        }
        exhausted(k);
    }

    public patTy(pat: ast.Pat): Ty {
        return this.patTys.get(pat.id) ||
            this.checkPat(pat);
    }

    private checkPat(pat: ast.Pat): Ty {
        const patRes = this.re.patRes(pat.id);
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return todo();
            case "bind": {
                switch (patRes.kind.tag) {
                    case "fn_param": {
                        const fnTy = this.fnItemTy(
                            patRes.kind.item,
                            patRes.kind.kind,
                        );
                        if (fnTy.kind.tag !== "fn") {
                            throw new Error();
                        }
                        const paramTy = fnTy.kind.params[patRes.kind.paramIdx];
                        this.assignPatTy(
                            patRes.kind.kind.params[patRes.kind.paramIdx].pat,
                            paramTy,
                        );
                        const ty = this.patTy(pat);
                        this.patTys.set(pat.id, ty);
                        return ty;
                    }
                    case "let": {
                        this.checkLetStmtTy(patRes.kind.stmt, patRes.kind.kind);
                        const ty = this.patTy(pat);
                        this.patTys.set(pat.id, ty);
                        return ty;
                    }
                }
                exhausted(patRes.kind);
                return todo();
            }
            case "path":
                return todo();
        }
        exhausted(k);
    }

    private resolveTys(a: Ty, b: Ty): Res<Ty, string> {
        if (a.kind.tag === "error" || b.kind.tag === "error") {
            return Res.Ok(a);
        }
        if (b.kind.tag === "unknown") {
            return Res.Ok(a);
        }
        const incompat = () => {
            const as = tyToString(this.ctx, a);
            const bs = tyToString(this.ctx, b);
            return Res.Err(
                `type '${as}' not compatible with type '${bs}'`,
            );
        };
        switch (a.kind.tag) {
            case "unknown":
                return this.resolveTys(b, a);
            case "null": {
                if (b.kind.tag !== "null") {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "int": {
                if (b.kind.tag !== "int") {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "bool": {
                if (b.kind.tag !== "bool") {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "fn": {
                if (b.kind.tag !== "fn") {
                    return incompat();
                }
                if (b.kind.item.id === a.kind.item.id) {
                    return incompat();
                }
                return Res.Ok(a);
            }
        }
        exhausted(a.kind);
    }

    private report(msg: string, span: Span) {
        this.ctx.report({
            severity: "error",
            file: this.currentFile,
            span,
            msg,
        });
    }
}
