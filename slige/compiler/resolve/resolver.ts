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
    ItemSyms,
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
        private tyResols: IdMap<AstId, Resolve>,
        private pathResols: IdMap<AstId, Resolve>,
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

    public tyRes(id: AstId): Resolve {
        if (!this.tyResols.has(id)) {
            throw new Error();
        }
        return this.tyResols.get(id)!;
    }

    public pathRes(id: AstId): Resolve {
        if (!this.pathResols.has(id)) {
            throw new Error();
        }
        return this.pathResols.get(id)!;
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
    private tyResols = new IdMap<AstId, Resolve>();
    private pathResols = new IdMap<AstId, Resolve>();

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
            this.tyResols,
            this.pathResols,
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
        this.syms.defTy(item.ident, { tag: "enum", item, kind });
        const outerSyms = this.syms;
        this.syms = new ItemSyms(this.syms);
        for (const variant of kind.variants) {
            ast.visitVariant(this, variant);
        }
        this.syms = outerSyms;
        return "stop";
    }

    visitStructItem(item: ast.Item, kind: ast.StructItem): ast.VisitRes {
        this.syms.defTy(item.ident, { tag: "struct", item, kind });
        const outerSyms = this.syms;
        this.syms = new ItemSyms(this.syms);
        ast.visitVariantData(this, kind.data);
        this.syms = outerSyms;
        return "stop";
    }

    visitVariant(variant: ast.Variant): ast.VisitRes {
        ast.visitVariantData(this, variant.data);
        return "stop";
    }

    visitFieldDef(field: ast.FieldDef): ast.VisitRes {
        ast.visitTy(this, field.ty);
        return "stop";
    }

    private fnBodiesToCheck: [ast.Item, ast.FnItem][][] = [];

    visitFnItem(item: ast.Item, kind: ast.FnItem): ast.VisitRes {
        this.syms.defVal(item.ident, { tag: "fn", item, kind });
        this.fnBodiesToCheck.at(-1)!.push([item, kind]);
        return "stop";
    }

    visitUseItem(item: ast.Item, kind: ast.UseItem): ast.VisitRes {
        todo();
    }

    visitTypeAliasItem(item: ast.Item, kind: ast.TypeAliasItem): ast.VisitRes {
        todo();
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
        if (kind.qty) {
            return todo();
        }
        const res = this.resolveValPath(kind.path);
        this.exprResols.set(expr.id, res);
        return "stop";
    }

    visitStructExpr(expr: ast.Expr, kind: ast.StructExpr): ast.VisitRes {
        if (!kind.path) {
            return todo();
        }
        this.resolveValPath(kind.path);
        return "stop";
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

    visitPathTy(ty: ast.Ty, kind: ast.PathTy): ast.VisitRes {
        if (kind.qty) {
            return todo();
        }
        const res = this.resolveTyPath(kind.path);
        this.tyResols.set(ty.id, res);
        return "stop";
    }

    visitPath(_path: ast.Path): ast.VisitRes {
        throw new Error("should not be reached");
    }

    visitIdent(_ident: ast.Ident): ast.VisitRes {
        throw new Error("should not be reached");
    }

    private resolveValPath(path: ast.Path): Resolve {
        let res: Resolve;
        if (path.segments.length === 0) {
            res = this.syms.getVal(path.segments[0].ident);
        } else {
            res = path.segments
                .slice(1)
                .reduce((inner, seg): Resolve => {
                    const k = inner.kind;
                    switch (k.tag) {
                        case "error":
                            return inner;
                        case "enum":
                            return this.resolveEnumVariant(k.item, k.kind, seg);
                        case "struct":
                        case "fn":
                        case "variant":
                        case "field":
                        case "local":
                            return todo();
                    }
                    exhausted();
                }, this.syms.getTy(path.segments[0].ident));
        }
        this.pathResols.set(path.id, res);
        return res;
    }

    private resolveTyPath(path: ast.Path): Resolve {
        const res = path.segments
            .slice(1)
            .reduce((inner, seg): Resolve => {
                const k = inner.kind;
                switch (k.tag) {
                    case "error":
                        return inner;
                    case "enum":
                        return this.resolveEnumVariant(k.item, k.kind, seg);
                    case "struct":
                    case "fn":
                    case "variant":
                    case "field":
                    case "local":
                        return todo();
                }
                exhausted();
            }, this.syms.getTy(path.segments[0].ident));
        this.pathResols.set(path.id, res);
        return res;
    }

    private resolveEnumVariant(
        item: ast.Item,
        kind: ast.EnumItem,
        seg: ast.PathSegment,
    ): Resolve {
        const { ident } = seg;
        const found = kind.variants
            .map((v, idx) => [v, idx] as const)
            .find(([variant]) => variant.ident.id === ident.id);
        if (!found) {
            this.report(
                `enum ${item.ident.text} has no member '${ident.text}'`,
                seg.span,
            );
            return ResolveError(ident);
        }
        const [variant, variantIdx] = found;
        return {
            ident,
            kind: { tag: "variant", item, kind, variant, variantIdx },
        };
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
