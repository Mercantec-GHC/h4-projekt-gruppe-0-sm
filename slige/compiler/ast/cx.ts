import { AstId, Ids, Span } from "@slige/common";
import {
    Attr,
    Expr,
    ExprKind,
    Ident,
    Item,
    ItemKind,
    Pat,
    Path,
    PathSegment,
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
        attrs: Attr[],
    ): Item {
        const id = this.id();
        return { id, kind, span, ident, pub, attrs };
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

    public path(segments: PathSegment[], span: Span): Path {
        const id = this.id();
        return { id, segments, span };
    }
}
