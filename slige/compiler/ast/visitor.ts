import { exhausted } from "@slige/common";

import {
    AnonStructTy,
    ArrayExpr,
    ArrayTy,
    AssignStmt,
    BinaryExpr,
    BindPat,
    Block,
    BlockExpr,
    BoolExpr,
    BoolPat,
    BreakStmt,
    CallExpr,
    CForExpr,
    DerefExpr,
    ElemExpr,
    EnumItem,
    Expr,
    ExprStmt,
    FieldDef,
    FieldExpr,
    File,
    FnItem,
    ForExpr,
    Generics,
    GroupExpr,
    Ident,
    IfExpr,
    IndexExpr,
    IntExpr,
    Item,
    ItemStmt,
    LetStmt,
    LoopExpr,
    MatchArm,
    MatchExpr,
    ModBlockItem,
    ModFileItem,
    Param,
    Pat,
    Path,
    PathExpr,
    PathPat,
    PathTy,
    PtrTy,
    RefExpr,
    RefTy,
    RepeatExpr,
    ReturnStmt,
    SliceTy,
    Stmt,
    StringExpr,
    StructExpr,
    StructItem,
    StructPat,
    TuplePat,
    TupleTy,
    Ty,
    TypeAliasItem,
    UnaryExpr,
    UseItem,
    Variant,
    VariantData,
    WhileExpr,
} from "./ast.ts";

export type VisitRes = "stop" | void;

type R = VisitRes;
type PM = unknown[];

export interface Visitor<
    P extends PM = [],
> {
    visitFile?(file: File, ...p: P): R;

    visitStmt?(stmt: Stmt, ...p: P): R;
    visitErrorStmt?(stmt: Stmt, ...p: P): R;
    visitItemStmt?(stmt: Stmt, kind: ItemStmt, ...p: P): R;
    visitLetStmt?(stmt: Stmt, kind: LetStmt, ...p: P): R;
    visitReturnStmt?(stmt: Stmt, kind: ReturnStmt, ...p: P): R;
    visitBreakStmt?(stmt: Stmt, kind: BreakStmt, ...p: P): R;
    visitContinueStmt?(stmt: Stmt, ...p: P): R;
    visitAssignStmt?(stmt: Stmt, kind: AssignStmt, ...p: P): R;
    visitExprStmt?(stmt: Stmt, kind: ExprStmt, ...p: P): R;

    visitItem?(item: Item, ...p: P): R;
    visitErrorItem?(item: Item, ...p: P): R;
    visitModBlockItem?(item: Item, kind: ModBlockItem, ...p: P): R;
    visitModFileItem?(item: Item, kind: ModFileItem, ...p: P): R;
    visitEnumItem?(item: Item, kind: EnumItem, ...p: P): R;
    visitStructItem?(item: Item, kind: StructItem, ...p: P): R;
    visitFnItem?(item: Item, kind: FnItem, ...p: P): R;
    visitUseItem?(item: Item, kind: UseItem, ...p: P): R;
    visitTypeAliasItem?(item: Item, kind: TypeAliasItem, ...p: P): R;

    visitVariant?(variant: Variant, ...p: P): R;
    visitVariantData?(data: VariantData, ...p: P): R;
    visitFieldDef?(field: FieldDef, ...p: P): R;

    visitExpr?(expr: Expr, ...p: P): R;
    visitErrorExpr?(expr: Expr, ...p: P): R;
    visitPathExpr?(expr: Expr, kind: PathExpr, ...p: P): R;
    visitNullExpr?(expr: Expr, ...p: P): R;
    visitIntExpr?(expr: Expr, kind: IntExpr, ...p: P): R;
    visitBoolExpr?(expr: Expr, kind: BoolExpr, ...p: P): R;
    visitStringExpr?(expr: Expr, kind: StringExpr, ...p: P): R;
    visitGroupExpr?(expr: Expr, kind: GroupExpr, ...p: P): R;
    visitArrayExpr?(expr: Expr, kind: ArrayExpr, ...p: P): R;
    visitRepeatExpr?(expr: Expr, kind: RepeatExpr, ...p: P): R;
    visitStructExpr?(expr: Expr, kind: StructExpr, ...p: P): R;
    visitRefExpr?(expr: Expr, kind: RefExpr, ...p: P): R;
    visitDerefExpr?(expr: Expr, kind: DerefExpr, ...p: P): R;
    visitElemExpr?(expr: Expr, kind: ElemExpr, ...p: P): R;
    visitFieldExpr?(expr: Expr, kind: FieldExpr, ...p: P): R;
    visitIndexExpr?(expr: Expr, kind: IndexExpr, ...p: P): R;
    visitCallExpr?(expr: Expr, kind: CallExpr, ...p: P): R;
    visitUnaryExpr?(expr: Expr, kind: UnaryExpr, ...p: P): R;
    visitBinaryExpr?(expr: Expr, kind: BinaryExpr, ...p: P): R;
    visitBlockExpr?(expr: Expr, kind: BlockExpr, ...p: P): R;
    visitIfExpr?(expr: Expr, kind: IfExpr, ...p: P): R;
    visitMatchExpr?(expr: Expr, kind: MatchExpr, ...p: P): R;
    visitLoopExpr?(expr: Expr, kind: LoopExpr, ...p: P): R;
    visitWhileExpr?(expr: Expr, kind: WhileExpr, ...p: P): R;
    visitForExpr?(expr: Expr, kind: ForExpr, ...p: P): R;
    visitCForExpr?(expr: Expr, kind: CForExpr, ...p: P): R;

    visitMatchArm?(arm: MatchArm, ...p: P): R;

    visitPat?(pat: Pat, ...p: P): R;
    visitErrorPat?(pat: Pat, ...p: P): R;
    visitBindPat?(pat: Pat, kind: BindPat, ...p: P): R;
    visitPathPat?(pat: Pat, kind: PathPat, ...p: P): R;
    visitBoolPat?(pat: Pat, kind: BoolPat, ...p: P): R;
    visitTuplePat?(pat: Pat, kind: TuplePat, ...p: P): R;
    visitStructPat?(pat: Pat, kind: StructPat, ...p: P): R;

    visitTy?(ty: Ty, ...p: P): R;
    visitErrorTy?(ty: Ty, ...p: P): R;
    visitNullTy?(ty: Ty, ...p: P): R;
    visitIntTy?(ty: Ty, ...p: P): R;
    visitBoolTy?(ty: Ty, ...p: P): R;
    visitStrTy?(ty: Ty, ...p: P): R;
    visitPathTy?(ty: Ty, kind: PathTy, ...p: P): R;
    visitRefTy?(ty: Ty, kind: RefTy, ...p: P): R;
    visitPtrTy?(ty: Ty, kind: PtrTy, ...p: P): R;
    visitSliceTy?(ty: Ty, kind: SliceTy, ...p: P): R;
    visitArrayTy?(ty: Ty, kind: ArrayTy, ...p: P): R;
    visitTupleTy?(ty: Ty, kind: TupleTy, ...p: P): R;
    visitAnonStructTy?(ty: Ty, kind: AnonStructTy, ...p: P): R;

    visitBlock?(block: Block, ...p: P): R;
    visitPath?(path: Path, ...p: P): R;
    visitIdent?(ident: Ident, ...p: P): R;
}

export function visitFile<
    P extends PM = [],
>(
    v: Visitor<P>,
    file: File,
    ...p: P
) {
    if (v.visitFile?.(file, ...p) === "stop") return;
    visitStmts(v, file.stmts, ...p);
}

export function visitStmts<
    P extends PM = [],
>(
    v: Visitor<P>,
    stmts: Stmt[],
    ...p: P
) {
    for (const stmt of stmts) {
        visitStmt(v, stmt, ...p);
    }
}

export function visitStmt<
    P extends PM = [],
>(
    v: Visitor<P>,
    stmt: Stmt,
    ...p: P
) {
    const kind = stmt.kind;
    switch (kind.tag) {
        case "error":
            if (v.visitErrorStmt?.(stmt, ...p) === "stop") return;
            return;
        case "item":
            if (v.visitItemStmt?.(stmt, kind, ...p) === "stop") return;
            visitItem(v, kind.item, ...p);
            return;
        case "let":
            if (v.visitLetStmt?.(stmt, kind, ...p) === "stop") return;
            visitPat(v, kind.pat, ...p);
            if (kind.ty) {
                visitTy(v, kind.ty, ...p);
            }
            if (kind.expr) {
                visitExpr(v, kind.expr, ...p);
            }
            return;
        case "return":
            if (v.visitReturnStmt?.(stmt, kind, ...p) === "stop") return;
            if (kind.expr) {
                visitExpr(v, kind.expr, ...p);
            }
            return;
        case "break":
            if (v.visitBreakStmt?.(stmt, kind, ...p) === "stop") return;
            kind.expr && visitExpr(v, kind.expr, ...p);
            return;
        case "continue":
            if (v.visitContinueStmt?.(stmt, ...p) === "stop") return;
            return;
        case "assign":
            if (v.visitAssignStmt?.(stmt, kind, ...p) === "stop") return;
            visitExpr(v, kind.subject, ...p);
            visitExpr(v, kind.value, ...p);
            return;
        case "expr":
            if (v.visitExprStmt?.(stmt, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            return;
    }
    exhausted(kind);
}

export function visitItem<
    P extends PM = [],
>(
    v: Visitor<P>,
    item: Item,
    ...p: P
) {
    const kind = item.kind;
    switch (kind.tag) {
        case "error":
            if (v.visitErrorItem?.(item, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            return;
        case "mod_block":
            if (v.visitModBlockItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            visitBlock(v, kind.block, ...p);
            return;
        case "mod_file":
            if (v.visitModFileItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            return;
        case "enum":
            if (v.visitEnumItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            for (const variant of kind.variants) {
                visitVariant(v, variant, ...p);
            }
            return;
        case "struct":
            if (v.visitStructItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            visitVariantData(v, kind.data, ...p);
            return;
        case "fn":
            if (v.visitFnItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            for (const param of kind.params) {
                visitParam(v, param, ...p);
            }
            kind.returnTy && visitTy(v, kind.returnTy, ...p);
            return;
        case "use":
            if (v.visitUseItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            return;
        case "type_alias":
            if (v.visitTypeAliasItem?.(item, kind, ...p) === "stop") return;
            visitIdent(v, item.ident, ...p);
            visitTy(v, kind.ty, ...p);
            return;
    }
    exhausted(kind);
}

export function visitVariant<
    P extends PM = [],
>(
    v: Visitor<P>,
    variant: Variant,
    ...p: P
) {
    if (v.visitVariant?.(variant, ...p) === "stop") return;
    visitIdent(v, variant.ident, ...p);
    visitVariantData(v, variant.data, ...p);
}

export function visitVariantData<
    P extends PM = [],
>(
    v: Visitor<P>,
    data: VariantData,
    ...p: P
) {
    if (v.visitVariantData?.(data, ...p) === "stop") return;
    const dk = data.kind;
    switch (dk.tag) {
        case "error":
            return;
        case "unit":
            return;
        case "tuple":
            for (const elem of dk.elems) {
                visitFieldDef(v, elem, ...p);
            }
            return;
        case "struct":
            for (const field of dk.fields) {
                visitFieldDef(v, field, ...p);
            }
            return;
    }
    exhausted(dk);
}

export function visitFieldDef<
    P extends PM = [],
>(
    v: Visitor<P>,
    field: FieldDef,
    ...p: P
) {
    if (v.visitFieldDef?.(field, ...p) === "stop") return;
    field.ident && visitIdent(v, field.ident, ...p);
    visitTy(v, field.ty, ...p);
}

export function visitGenerics<
    P extends PM = [],
>(
    v: Visitor<P>,
    generics: Generics,
    ...p: P
) {
    for (const param of generics.params) {
        visitIdent(v, param.ident, ...p);
    }
}

export function visitParam<
    P extends PM = [],
>(
    v: Visitor<P>,
    param: Param,
    ...p: P
) {
    visitPat(v, param.pat, ...p);
    visitTy(v, param.ty, ...p);
}

export function visitExpr<
    P extends PM = [],
>(
    v: Visitor<P>,
    expr: Expr,
    ...p: P
) {
    const kind = expr.kind;
    switch (kind.tag) {
        case "error":
            if (v.visitErrorExpr?.(expr, ...p) === "stop") return;
            return;
        case "path":
            if (v.visitPathExpr?.(expr, kind, ...p) === "stop") return;
            visitPath(v, kind.path, ...p);
            return;
        case "null":
            if (v.visitNullExpr?.(expr, ...p) === "stop") return;
            return;
        case "int":
            if (v.visitIntExpr?.(expr, kind, ...p) === "stop") return;
            return;
        case "str":
            if (v.visitStringExpr?.(expr, kind, ...p) === "stop") return;
            return;
        case "bool":
            if (v.visitBoolExpr?.(expr, kind, ...p) === "stop") return;
            return;
        case "group":
            if (v.visitGroupExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            return;
        case "array":
            if (v.visitArrayExpr?.(expr, kind, ...p) === "stop") return;
            for (const expr of kind.exprs) {
                visitExpr(v, expr, ...p);
            }
            return;
        case "repeat":
            if (v.visitRepeatExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            visitExpr(v, kind.length, ...p);
            return;
        case "struct":
            if (v.visitStructExpr?.(expr, kind, ...p) === "stop") return;
            if (kind.path) {
                visitPath(v, kind.path, ...p);
            }
            for (const field of kind.fields) {
                visitIdent(v, field.ident, ...p);
                visitExpr(v, field.expr, ...p);
            }
            return;
        case "ref":
            if (v.visitRefExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            return;
        case "deref":
            if (v.visitDerefExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            return;
        case "elem":
            if (v.visitElemExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            return;
        case "field":
            if (v.visitFieldExpr?.(expr, kind, ...p) === "stop") return;
            v.visitExpr?.(kind.expr, ...p);
            v.visitIdent?.(kind.ident, ...p);
            return;
        case "index":
            if (v.visitIndexExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            visitExpr(v, kind.index, ...p);
            return;
        case "call":
            if (v.visitCallExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            for (const expr of kind.args) {
                visitExpr(v, expr, ...p);
            }
            return;
        case "unary":
            if (v.visitUnaryExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            return;
        case "binary":
            if (v.visitBinaryExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.left, ...p);
            visitExpr(v, kind.right, ...p);
            return;
        case "block":
            if (v.visitBlockExpr?.(expr, kind, ...p) === "stop") return;
            visitBlock(v, kind.block, ...p);
            return;
        case "if":
            if (v.visitIfExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.cond, ...p);
            visitExpr(v, kind.truthy, ...p);
            if (kind.falsy) {
                visitExpr(v, kind.falsy, ...p);
            }
            return;
        case "match":
            if (v.visitMatchExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.expr, ...p);
            for (const arm of kind.arms) {
                visitMatchArm(v, arm, ...p);
            }
            return;
        case "loop":
            if (v.visitLoopExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.body, ...p);
            return;
        case "while":
            if (v.visitWhileExpr?.(expr, kind, ...p) === "stop") return;
            visitExpr(v, kind.cond, ...p);
            visitExpr(v, kind.body, ...p);
            return;
        case "for":
            if (v.visitForExpr?.(expr, kind, ...p) === "stop") return;
            visitPat(v, kind.pat, ...p);
            visitExpr(v, kind.expr, ...p);
            visitExpr(v, kind.body, ...p);
            return;
        case "c_for":
            if (v.visitCForExpr?.(expr, kind, ...p) === "stop") return;
            if (kind.decl) {
                visitStmt(v, kind.decl, ...p);
            }
            if (kind.cond) {
                visitExpr(v, kind.cond, ...p);
            }
            if (kind.incr) {
                visitStmt(v, kind.incr, ...p);
            }
            return;
    }
    exhausted(kind);
}

export function visitMatchArm<
    P extends PM = [],
>(
    v: Visitor<P>,
    arm: MatchArm,
    ...p: P
) {
    if (v.visitMatchArm?.(arm, ...p) === "stop") return;
    visitPat(v, arm.pat, ...p);
    visitExpr(v, arm.expr, ...p);
}

export function visitPat<
    P extends PM = [],
>(
    v: Visitor<P>,
    pat: Pat,
    ...p: P
) {
    const kind = pat.kind;
    switch (kind.tag) {
        case "error":
            if (v.visitErrorPat?.(pat, ...p) === "stop") return;
            return;
        case "bind":
            if (v.visitBindPat?.(pat, kind, ...p) === "stop") return;
            visitIdent(v, kind.ident, ...p);
            return;
        case "path":
            if (v.visitPathPat?.(pat, kind, ...p) === "stop") return;
            visitPath(v, kind.path, ...p);
            return;
        case "bool":
            if (v.visitBoolPat?.(pat, kind, ...p) === "stop") return;
            return;
        case "tuple":
            if (v.visitTuplePat?.(pat, kind, ...p) === "stop") return;
            kind.path && visitPath(v, kind.path, ...p);
            for (const pat of kind.elems) {
                visitPat(v, pat, ...p);
            }
            return;
        case "struct":
            if (v.visitStructPat?.(pat, kind, ...p) === "stop") return;
            kind.path && visitPath(v, kind.path, ...p);
            for (const field of kind.fields) {
                visitIdent(v, field.ident, ...p);
                visitPat(v, field.pat, ...p);
            }
            return;
    }
    exhausted(kind);
}

export function visitTy<
    P extends PM = [],
>(
    v: Visitor<P>,
    ty: Ty,
    ...p: P
) {
    const kind = ty.kind;
    switch (kind.tag) {
        case "error":
            if (v.visitErrorTy?.(ty, ...p) === "stop") return;
            return;
        case "null":
            if (v.visitNullTy?.(ty, ...p) === "stop") return;
            return;
        case "int":
            if (v.visitIntTy?.(ty, ...p) === "stop") return;
            return;
        case "bool":
            if (v.visitBoolTy?.(ty, ...p) === "stop") return;
            return;
        case "str":
            if (v.visitStrTy?.(ty, ...p) === "stop") return;
            return;
        case "path":
            if (v.visitPathTy?.(ty, kind, ...p) === "stop") return;
            v.visitPath?.(kind.path, ...p);
            return;
        case "ref":
            if (v.visitRefTy?.(ty, kind, ...p) === "stop") return;
            v.visitTy?.(kind.ty, ...p);
            return;
        case "ptr":
            if (v.visitPtrTy?.(ty, kind, ...p) === "stop") return;
            v.visitTy?.(kind.ty, ...p);
            return;
        case "slice":
            if (v.visitSliceTy?.(ty, kind, ...p) === "stop") return;
            v.visitTy?.(kind.ty, ...p);
            return;
        case "array":
            if (v.visitArrayTy?.(ty, kind, ...p) === "stop") return;
            v.visitTy?.(kind.ty, ...p);
            v.visitExpr?.(kind.length, ...p);
            return;
        case "anon_struct":
            if (v.visitAnonStructTy?.(ty, kind, ...p) === "stop") return;
            for (const field of kind.fields) {
                v.visitIdent?.(field.ident, ...p);
                v.visitTy?.(field.ty, ...p);
            }
            return;
    }
    exhausted(kind);
}

export function visitBlock<
    P extends PM = [],
>(
    v: Visitor<P>,
    block: Block,
    ...p: P
) {
    if (v.visitBlock?.(block, ...p) === "stop") return;
    for (const stmt of block.stmts) {
        visitStmt(v, stmt, ...p);
    }
    if (block.expr) {
        visitExpr(v, block.expr, ...p);
    }
}

export function visitPath<
    P extends PM = [],
>(
    v: Visitor<P>,
    path: Path,
    ...p: P
) {
    if (v.visitPath?.(path, ...p) === "stop") return;
    for (const seg of path.segments) {
        visitIdent(v, seg.ident, ...p);
    }
}

export function visitIdent<
    P extends PM = [],
>(
    v: Visitor<P>,
    ident: Ident,
    ...p: P
) {
    v.visitIdent?.(ident, ...p);
}
