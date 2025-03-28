export type Block = {
    id: number;
    lineEntry: number;
    lineExit: number;
    stmts: Stmt[];
};

export type Stmt = {
    id: number;
    line: number;
    kind: StmtKind;
};

export type StmtKind =
    | { tag: "error" }
    | { tag: "fn" } & FnStmt
    | { tag: "let" } & LetStmt
    | { tag: "loop"; body: Block }
    | { tag: "while"; expr: Expr; body: Block }
    | { tag: "if"; expr: Expr; truthy: Block; falsy?: Block }
    | { tag: "return"; expr?: Expr }
    | { tag: "break" }
    | { tag: "assign"; subject: Expr; expr: Expr }
    | { tag: "expr"; expr: Expr };

export type FnStmt = {
    ident: string;
    attrs: Attr[];
    params: Param[];
    returnTy: Ty;
    body: Block;
};

export type LetStmt = {
    ident: string;
    ty?: Ty;
    expr?: Expr;
};

export type Param = {
    ident: string;
    line: number;
    ty: Ty;
};

export type Expr = {
    id: number;
    line: number;
    kind: ExprKind;
};

export type ExprKind =
    | { tag: "error" }
    | { tag: "ident"; ident: string }
    | { tag: "int"; val: number }
    | { tag: "str"; val: string }
    | { tag: "call"; expr: Expr; args: Expr[] }
    | { tag: "not"; expr: Expr }
    | { tag: "negate"; expr: Expr }
    | { tag: "binary"; op: BinaryOp; left: Expr; right: Expr };

export type BinaryOp =
    | "or"
    | "xor"
    | "and"
    | "<"
    | ">"
    | "<="
    | ">="
    | "=="
    | "!="
    | "+"
    | "-"
    | "*"
    | "/"
    | "%";

export type Ty = {
    id: number;
    line: number;
    kind: TyKind;
};

export type TyKind =
    | { tag: "error" }
    | { tag: "void" }
    | { tag: "ident"; ident: string }
    | { tag: "ptr"; ty: Ty };

export type Attr = {
    ident: string;
    args: Expr[];
};
