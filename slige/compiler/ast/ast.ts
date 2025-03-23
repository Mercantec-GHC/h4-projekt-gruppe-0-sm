import { AstId, File as CtxFile, IdentId, Span } from "@slige/common";

export type File = {
    stmts: Stmt[];
    file: CtxFile;
};

export type Stmt = {
    id: AstId;
    kind: StmtKind;
    span: Span;
};

export type StmtKind =
    | { tag: "error" }
    | { tag: "item" } & ItemStmt
    | { tag: "let" } & LetStmt
    | { tag: "return" } & ReturnStmt
    | { tag: "break" } & BreakStmt
    | { tag: "continue" }
    | { tag: "assign" } & AssignStmt
    | { tag: "expr" } & ExprStmt;

export type ItemStmt = { item: Item };

export type LetStmt = {
    pat: Pat;
    ty?: Ty;
    expr?: Expr;
};

export type ReturnStmt = { expr?: Expr };
export type BreakStmt = { expr?: Expr };

export type AssignStmt = {
    assignType: AssignType;
    subject: Expr;
    value: Expr;
};

export type AssignType = "=" | "+=" | "-=";

export type ExprStmt = { expr: Expr };

export type Item = {
    id: AstId;
    kind: ItemKind;
    span: Span;
    ident: Ident;
    pub: boolean;
    attrs: Attr[];
};

export type ItemKind =
    | { tag: "error" }
    | { tag: "mod_block" } & ModBlockItem
    | { tag: "mod_file" } & ModFileItem
    | { tag: "enum" } & EnumItem
    | { tag: "struct" } & StructItem
    | { tag: "fn" } & FnItem
    | { tag: "use" } & UseItem
    | { tag: "type_alias" } & TypeAliasItem;

export type ModBlockItem = { block: Block };

export type ModFileItem = { filePath: string; file?: CtxFile; ast?: File };

export type EnumItem = { variants: Variant[] };
export type StructItem = { data: VariantData };

export type FnItem = {
    generics?: Generics;
    params: Param[];
    returnTy?: Ty;
    body?: Block;
};

export type UseItem = { _: 0 };
export type TypeAliasItem = { ty: Ty };

export type Variant = {
    ident: Ident;
    data: VariantData;
    pub: boolean;
    span: Span;
};

export type VariantData = {
    kind: VariantDataKind;
    span: Span;
};

export type VariantDataKind =
    | { tag: "error" }
    | { tag: "unit" }
    | { tag: "tuple" } & TupleVariantData
    | { tag: "struct" } & StructVariantData;

export type TupleVariantData = { elems: FieldDef[] };
export type StructVariantData = { fields: FieldDef[] };

export type FieldDef = {
    ident?: Ident;
    ty: Ty;
    pub: boolean;
    span: Span;
};

export type Param = {
    pat: Pat;
    ty: Ty;
    span: Span;
};

export type Generics = {
    params: GenericParam[];
};

export type GenericParam = {
    ident: Ident;
    span: Span;
};

export type Expr = {
    id: AstId;
    kind: ExprKind;
    span: Span;
};

export type ExprKind =
    | { tag: "error" }
    | { tag: "path" } & PathExpr
    | { tag: "null" }
    | { tag: "int" } & IntExpr
    | { tag: "bool" } & BoolExpr
    | { tag: "str" } & StringExpr
    | { tag: "group" } & GroupExpr
    | { tag: "array" } & ArrayExpr
    | { tag: "repeat" } & RepeatExpr
    | { tag: "struct" } & StructExpr
    | { tag: "ref" } & RefExpr
    | { tag: "deref" } & DerefExpr
    | { tag: "elem" } & ElemExpr
    | { tag: "field" } & FieldExpr
    | { tag: "index" } & IndexExpr
    | { tag: "call" } & CallExpr
    | { tag: "unary" } & UnaryExpr
    | { tag: "binary" } & BinaryExpr
    | { tag: "block" } & BlockExpr
    | { tag: "if" } & IfExpr
    | { tag: "match" } & MatchExpr
    | { tag: "loop" } & LoopExpr
    | { tag: "while" } & WhileExpr
    | { tag: "for" } & ForExpr
    | { tag: "c_for" } & CForExpr;

export type PathExpr = { qty?: Ty; path: Path };
export type IntExpr = { value: number };
export type BoolExpr = { value: boolean };
export type StringExpr = { value: string };
export type GroupExpr = { expr: Expr };
export type ArrayExpr = { exprs: Expr[] };
export type RepeatExpr = { expr: Expr; length: Expr };
export type StructExpr = { path?: Path; fields: ExprField[] };
export type RefExpr = { expr: Expr; refType: RefType; mut: boolean };
export type DerefExpr = { expr: Expr };
export type ElemExpr = { expr: Expr; elem: number };
export type FieldExpr = { expr: Expr; ident: Ident };
export type IndexExpr = { expr: Expr; index: Expr };
export type CallExpr = { expr: Expr; args: Expr[] };
export type UnaryExpr = { unaryType: UnaryType; expr: Expr };
export type BinaryExpr = { binaryType: BinaryType; left: Expr; right: Expr };
export type BlockExpr = { block: Block };
export type IfExpr = { cond: Expr; truthy: Expr; falsy?: Expr };
export type MatchExpr = { expr: Expr; arms: MatchArm[] };
export type LoopExpr = { body: Expr };
export type WhileExpr = { cond: Expr; body: Expr };
export type ForExpr = { pat: Pat; expr: Expr; body: Expr };
export type CForExpr = { decl?: Stmt; cond?: Expr; incr?: Stmt; body: Expr };

export type MatchArm = {
    pat: Pat;
    expr: Expr;
    span: Span;
};

export type RefType = "ref" | "ptr";
export type UnaryType = "not" | "-";
export type BinaryType =
    | "+"
    | "-"
    | "*"
    | "/"
    | "=="
    | "!="
    | "<"
    | ">"
    | "<="
    | ">="
    | "or"
    | "and";

export type ExprField = {
    ident: Ident;
    expr: Expr;
    span: Span;
};

export type Block = {
    stmts: Stmt[];
    expr?: Expr;
    span: Span;
};

export type Pat = {
    id: AstId;
    kind: PatKind;
    span: Span;
};

export type PatKind =
    | { tag: "error" }
    | { tag: "bind" } & BindPat
    | { tag: "path" } & PathPat
    | { tag: "bool" } & BoolPat
    | { tag: "tuple" } & TuplePat
    | { tag: "struct" } & StructPat;

export type BindPat = { ident: Ident; mut: boolean };
export type PathPat = { qty?: Ty; path: Path };
export type BoolPat = { value: boolean };
export type TuplePat = { path?: Path; elems: Pat[] };
export type StructPat = { path?: Path; fields: PatField[] };

export type PatField = {
    ident: Ident;
    pat: Pat;
    span: Span;
};

export type Ty = {
    id: AstId;
    kind: TyKind;
    span: Span;
};

export type TyKind =
    | { tag: "error" }
    | { tag: "null" }
    | { tag: "int" }
    | { tag: "bool" }
    | { tag: "str" }
    | { tag: "path" } & PathTy
    | { tag: "ref" } & RefTy
    | { tag: "ptr" } & PtrTy
    | { tag: "slice" } & SliceTy
    | { tag: "array" } & ArrayTy
    | { tag: "anon_struct" } & AnonStructTy;

export type PathTy = { qty?: Ty; path: Path };
export type RefTy = { ty: Ty; mut: boolean };
export type PtrTy = { ty: Ty; mut: boolean };
export type SliceTy = { ty: Ty };
export type ArrayTy = { ty: Ty; length: Expr };
export type TupleTy = { elems: Ty[] };
export type AnonStructTy = { fields: AnonFieldDef[] };

export type AnonFieldDef = {
    ident: Ident;
    ty: Ty;
    span: Span;
};

export type Path = {
    id: AstId;
    segments: PathSegment[];
    span: Span;
};

export type PathSegment = {
    ident: Ident;
    genericArgs?: Ty[];
    span: Span;
};

export type Ident = {
    id: IdentId;
    text: string;
    span: Span;
};

export type Attr = {
    ident: Ident;
    args?: Expr[];
    span: Span;
};
