import { Span } from "../diagnostics.ts";
import { AstId, Ids } from "../ids.ts";
import {
    Expr,
    ExprKind,
    Ident,
    Item,
    ItemKind,
    Pat,
    PatKind,
    Stmt,
    StmtKind,
    Ty,
    TyKind,
} from "./ast.ts";

export class Cx {
    private astIdGen = new Ids<AstId>();

    private id(): AstId {
        return this.astIdGen.nextThenStep();
    }

    public stmt(kind: StmtKind, span: Span): Stmt {
        const id = this.id();
        return { id, kind, span };
    }

    public item(
        kind: ItemKind,
        span: Span,
        ident: Ident,
        pub: boolean,
    ): Item {
        const id = this.id();
        return { id, kind, span, ident, pub };
    }

    public expr(kind: ExprKind, span: Span): Expr {
        const id = this.id();
        return { id, kind, span };
    }

    public pat(kind: PatKind, span: Span): Pat {
        const id = this.id();
        return { id, kind, span };
    }

    public ty(kind: TyKind, span: Span): Ty {
        const id = this.id();
        return { id, kind, span };
    }
}
