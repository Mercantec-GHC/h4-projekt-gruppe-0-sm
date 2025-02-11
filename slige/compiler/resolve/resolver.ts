import * as ast from "@slige/ast";
import {
    AstId,
    Ctx,
    exhausted,
    File,
    IdMap,
    Ids,
    Res,
    Span,
    todo,
} from "@slige/common";
import {
    FnSyms,
    LocalSyms,
    LoopBreakResolve,
    LoopResolve,
    PatResolve,
    PatResolveKind,
    Redef,
    Resolve,
    ResolveError,
    RootSyms,
    Syms,
} from "./cx.ts";

export class Resols {
    public constructor(
        private exprResols: IdMap<AstId, Resolve>,
        private patResols: IdMap<AstId, PatResolve>,
        private loopsResols: IdMap<AstId, LoopResolve>,
        private loopBreakResols: IdMap<AstId, LoopBreakResolve[]>,
    ) {}

    public exprRes(id: AstId): Resolve {
        if (!this.exprResols.has(id)) {
            throw new Error();
        }
        return this.exprResols.get(id)!;
    }

    public patRes(id: AstId): PatResolve {
        if (!this.patResols.has(id)) {
            throw new Error();
        }
        return this.patResols.get(id)!;
    }

    public loopRes(id: AstId): LoopResolve {
        if (!this.loopsResols.has(id)) {
            throw new Error();
        }
        return this.loopsResols.get(id)!;
    }

    public loopBreaks(id: AstId): LoopBreakResolve[] {
        if (!this.loopBreakResols.has(id)) {
            throw new Error();
        }
        return this.loopBreakResols.get(id)!;
    }
}

export class Resolver implements ast.Visitor {
    private currentFile!: File;
    private rootSyms = new RootSyms();
    private syms: Syms = this.rootSyms;

    private exprResols = new IdMap<AstId, Resolve>();

    private patResols = new IdMap<AstId, PatResolve>();
    private patResolveStack: PatResolveKind[] = [];

    private loopsResols = new IdMap<AstId, LoopResolve>();
    private loopBreakResols = new IdMap<AstId, LoopBreakResolve[]>();
    private loopResolveStack: LoopResolve[] = [{ tag: "error" }];

    public constructor(
        private ctx: Ctx,
        private entryFileAst: ast.File,
    ) {}

    public resolve(): Resols {
        ast.visitFile(this, this.entryFileAst);
        return new Resols(
            this.exprResols,
            this.patResols,
            this.loopsResols,
            this.loopBreakResols,
        );
    }

    visitFile(file: ast.File): ast.VisitRes {
        this.currentFile = file.file;
        this.fnBodiesToCheck.push([]);
        ast.visitStmts(this, file.stmts);
        this.popAndVisitFnBodies();
        return "stop";
    }

    visitBlock(block: ast.Block): ast.VisitRes {
        this.fnBodiesToCheck.push([]);
        ast.visitStmts(this, block.stmts);
        this.popAndVisitFnBodies();
        block.expr && ast.visitExpr(this, block.expr);
        return "stop";
    }

    visitLetStmt(stmt: ast.Stmt, kind: ast.LetStmt): ast.VisitRes {
        kind.ty && ast.visitTy(this, kind.ty);
        kind.expr && ast.visitExpr(this, kind.expr);
        this.syms = new LocalSyms(this.syms);
        this.patResolveStack.push({ tag: "let", stmt, kind });
        ast.visitPat(this, kind.pat);
        this.patResolveStack.pop();
        return "stop";
    }

    visitModBlockItem(item: ast.Item, kind: ast.ModBlockItem): ast.VisitRes {
        todo();
    }

    visitModFileItem(item: ast.Item, kind: ast.ModFileItem): ast.VisitRes {
        ast.visitFile(this, kind.ast!);
        todo();
    }

    visitBreakStmt(stmt: ast.Stmt, kind: ast.BreakStmt): ast.VisitRes {
        const res = this.loopResolveStack.at(-1)!;
        if (res.tag === "error") {
            this.report("no loop to break", stmt.span);
            return;
        }
        this.loopsResols.set(stmt.id, res);
        this.loopBreakResols.get(res.expr.id)!.push({ stmt, kind });
    }

    visitContinueStmt(stmt: ast.Stmt): ast.VisitRes {
        const res = this.loopResolveStack.at(-1)!;
        if (res.tag === "error") {
            this.report("no loop to continue", stmt.span);
            return;
        }
        this.loopsResols.set(stmt.id, res);
    }

    visitEnumItem(item: ast.Item, kind: ast.EnumItem): ast.VisitRes {
        todo();
    }

    visitStructItem(item: ast.Item, kind: ast.StructItem): ast.VisitRes {
        todo();
    }

    private fnBodiesToCheck: [ast.Item, ast.FnItem][][] = [];

    visitFnItem(item: ast.Item, kind: ast.FnItem): ast.VisitRes {
        this.syms.defVal(item.ident, { tag: "fn", item, kind });
        this.fnBodiesToCheck.at(-1)!.push([item, kind]);
        return "stop";
    }

    private popAndVisitFnBodies() {
        for (const [item, kind] of this.fnBodiesToCheck.at(-1)!) {
            const outerSyms = this.syms;
            this.syms = new FnSyms(this.syms);
            this.syms = new LocalSyms(this.syms);
            for (const [paramIdx, param] of kind.params.entries()) {
                this.patResolveStack.push({
                    tag: "fn_param",
                    item,
                    kind,
                    paramIdx,
                });
                ast.visitParam(this, param);
                this.patResolveStack.pop();
            }
            ast.visitBlock(this, kind.body!);
            this.syms = outerSyms;
        }
        this.fnBodiesToCheck.pop();
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

    visitLoopExpr(expr: ast.Expr, kind: ast.LoopExpr): ast.VisitRes {
        this.genericVisitLoop(expr, kind.body, { tag: "loop", expr, kind });
        return "stop";
    }

    visitWhileExpr(expr: ast.Expr, kind: ast.WhileExpr): ast.VisitRes {
        ast.visitExpr(this, kind.cond);
        this.genericVisitLoop(expr, kind.body, { tag: "while", expr, kind });
        return "stop";
    }

    visitForExpr(expr: ast.Expr, kind: ast.ForExpr): ast.VisitRes {
        todo();
        return "stop";
    }

    visitCForExpr(expr: ast.Expr, kind: ast.CForExpr): ast.VisitRes {
        const outerSyms = this.syms;
        this.syms = new LocalSyms(this.syms);

        kind.decl && ast.visitStmt(this, kind.decl);
        kind.cond && ast.visitExpr(this, kind.cond);
        kind.incr && ast.visitStmt(this, kind.incr);
        this.genericVisitLoop(expr, kind.body, { tag: "cfor", expr, kind });
        this.syms = outerSyms;
        return "stop";
    }

    private genericVisitLoop(expr: ast.Expr, body: ast.Expr, res: LoopResolve) {
        this.loopResolveStack.push(res);
        this.loopBreakResols.set(expr.id, []);
        ast.visitExpr(this, body);
        this.loopResolveStack.pop();
        return "stop";
    }

    visitBindPat(pat: ast.Pat, kind: ast.BindPat): ast.VisitRes {
        this.patResols.set(pat.id, { pat, kind: this.patResolveStack.at(-1)! });
        const res = this.syms.defVal(kind.ident, {
            tag: "local",
            id: pat.id,
        });
        if (!res.ok) {
            const text = this.ctx.identText(kind.ident.id);
            this.report(`redefinition of value '${text}'`, kind.ident.span);
        }
        return "stop";
    }

    visitPathPat(pat: ast.Pat, kind: ast.PathPat): ast.VisitRes {
        todo(pat, kind);
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

    private report(msg: string, span: Span) {
        this.ctx.report({
            severity: "error",
            file: this.currentFile,
            span,
            msg,
        });
    }
}
