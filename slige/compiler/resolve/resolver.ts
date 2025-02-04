import * as ast from "@slige/ast";
import { AstId, Ctx, exhausted, File, IdMap, Ids, todo } from "@slige/common";
import {
    FnSyms,
    LocalId,
    LocalSyms,
    Resolve,
    ResolveError,
    RootSyms,
    Syms,
} from "./cx.ts";
export { type LocalId } from "./cx.ts";

export class Resols {
    public constructor(
        private exprResols: IdMap<AstId, Resolve>,
    ) {}

    public exprRes(id: AstId): Resolve {
        if (!this.exprResols.has(id)) {
            throw new Error();
        }
        return this.exprResols.get(id)!;
    }
}

export class Resolver implements ast.Visitor {
    private currentFile!: File;
    private rootSyms = new RootSyms();
    private syms: Syms = this.rootSyms;

    private exprResols = new IdMap<AstId, Resolve>();

    private localIds = new Ids<LocalId>();

    public constructor(
        private ctx: Ctx,
        private entryFileAst: ast.File,
    ) {}

    public resolve(): Resols {
        ast.visitFile(this, this.entryFileAst);
        return new Resols(
            this.exprResols,
        );
    }

    visitFile(file: ast.File): ast.VisitRes {
        this.currentFile = file.file;
        ast.visitStmts(this, file.stmts);
        this.visitFnBodies();
        return "stop";
    }

    visitLetStmt(stmt: ast.Stmt, kind: ast.LetStmt): ast.VisitRes {
        kind.ty && ast.visitTy(this, kind.ty);
        kind.expr && ast.visitExpr(this, kind.expr);
        this.syms = new LocalSyms(this.syms);
        ast.visitPat(this, kind.pat);
        return "stop";
    }

    visitModBlockItem(item: ast.Item, kind: ast.ModBlockItem): ast.VisitRes {
        todo();
    }

    visitModFileItem(item: ast.Item, kind: ast.ModFileItem): ast.VisitRes {
        ast.visitFile(this, kind.ast!);
        todo();
    }

    visitEnumItem(item: ast.Item, kind: ast.EnumItem): ast.VisitRes {
        todo();
    }

    visitStructItem(item: ast.Item, kind: ast.StructItem): ast.VisitRes {
        todo();
    }

    private fnBodiesToCheck: [ast.Item, ast.FnItem][] = [];

    visitFnItem(item: ast.Item, kind: ast.FnItem): ast.VisitRes {
        this.syms.defVal(item.ident, { tag: "fn", item, kind });
        this.fnBodiesToCheck.push([item, kind]);
        return "stop";
    }

    private visitFnBodies() {
        for (const [_item, kind] of this.fnBodiesToCheck) {
            const outerSyms = this.syms;
            this.syms = new FnSyms(this.syms);
            this.syms = new LocalSyms(this.syms);
            for (const param of kind.params) {
                ast.visitParam(this, param);
            }
            this.syms = outerSyms;
        }
        this.fnBodiesToCheck = [];
    }

    visitPathExpr(expr: ast.Expr, kind: ast.PathExpr): ast.VisitRes {
        if (kind.path.segments.length === 1) {
            const res = this.syms.getVal(kind.path.segments[0].ident);
            switch (res.kind.tag) {
                case "error":
                    return "stop";
                case "fn":
                    this.exprResols.set(expr.id, res);
                    return "stop";
                case "local":
                    this.exprResols.set(expr.id, res);
                    return "stop";
            }
            exhausted(res.kind);
        }
        const pathRes = this.resolveInnerPath(kind.path);
        switch (pathRes.kind.tag) {
            case "error":
                todo();
                return "stop";
            case "fn":
                todo();
                return "stop";
            case "local":
                todo();
                return "stop";
        }
        exhausted(pathRes.kind);
    }

    visitUseItem(item: ast.Item, kind: ast.UseItem): ast.VisitRes {
        todo();
    }

    visitTypeAliasItem(item: ast.Item, kind: ast.TypeAliasItem): ast.VisitRes {
        todo();
    }

    visitBindPat(pat: ast.Pat, kind: ast.BindPat): ast.VisitRes {
        const res = this.syms.defVal(kind.ident, {
            tag: "local",
            id: this.localIds.nextThenStep(),
        });
        if (!res.ok) {
            const text = this.ctx.identText(kind.ident.id);
            this.ctx.report({
                severity: "error",
                file: this.currentFile,
                span: kind.ident.span,
                msg: `redefinition of value '${text}'`,
            });
        }
        return "stop";
    }

    visitPathPat(pat: ast.Pat, kind: ast.PathPat): ast.VisitRes {
        todo(pat, kind);
    }

    visitBlock(block: ast.Block): ast.VisitRes {
        ast.visitStmts(this, block.stmts);
        this.visitFnBodies();
        block.expr && ast.visitExpr(this, block.expr);
        return "stop";
    }

    visitPath(_path: ast.Path): ast.VisitRes {
        throw new Error("should not be reached");
    }

    visitIdent(_ident: ast.Ident): ast.VisitRes {
        throw new Error("should not be reached");
    }

    private resolveInnerPath(path: ast.Path): Resolve {
        const res = path.segments.slice(1, path.segments.length)
            .reduce((innerRes, seg) => {
                const k = innerRes.kind;
                switch (k.tag) {
                    case "error":
                        return innerRes;
                    case "fn":
                        this.ctx.report({
                            severity: "error",
                            file: this.currentFile,
                            span: seg.ident.span,
                            msg: "function, not pathable",
                        });
                        return ResolveError(seg.ident);
                    case "local":
                        this.ctx.report({
                            severity: "error",
                            file: this.currentFile,
                            span: seg.ident.span,
                            msg: "local variable, not pathable",
                        });
                        return ResolveError(seg.ident);
                }
                exhausted(k);
            }, this.syms.getTy(path.segments[0].ident));
        return res;
    }
}
