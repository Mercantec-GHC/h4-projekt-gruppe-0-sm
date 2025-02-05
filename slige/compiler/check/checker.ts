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
        private resols: resolve.Resols,
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
        const ty = exprTy && tyTy && this.resolveTys(exprTy.val, tyTy.val);

        if (ty === undefined) {
            this.report("type amfibious, specify type or value", stmt.span);
            return Ty({ tag: "error" });
        }

        if (!ty.ok) {
            this.report(ty.val, stmt.span);
            return Ty({ tag: "error" });
        }

        const res = this.assignPatTy(kind.pat, ty.val);
        if (!res.ok) {
            this.report(res.val, stmt.span);
            return Ty({ tag: "error" });
        }

        this.stmtChecked.add(stmt.id);
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
                return todo();
            case "int":
                return todo();
            case "bool":
                return todo();
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
                return todo();
            case "unary":
                return todo();
            case "binary":
                return todo();
            case "block":
                return todo();
            case "if":
                return todo();
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
        const res = this.resols.exprRes(expr.id);
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
                const patRes = this.resols.patRes(res.kind.id);
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
        const patRes = this.resols.patRes(pat.id);
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return todo();
            case "bind":
                return todo();
            case "path":
                return todo();
        }
        exhausted(k);
    }

    private resolveTys(a: Ty, b: Ty): Res<Ty, string> {
        const as = tyToString(this.ctx, a);
        const bs = tyToString(this.ctx, b);
        const incompat = () =>
            Res.Err(
                `type '${as}' not compatible with type '${bs}'`,
            );
        switch (a.kind.tag) {
            case "error":
                return Res.Ok(b);
            case "unknown":
                return Res.Ok(b);
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
