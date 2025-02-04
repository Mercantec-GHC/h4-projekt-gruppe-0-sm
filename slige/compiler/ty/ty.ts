import * as ast from "@slige/ast";

export type Ty = {
    kind: TyKind;
};

export const Ty = (kind: TyKind): Ty => ({ kind });

export type TyKind =
    | { tag: "error" }
    | { tag: "unknown" }
    | { tag: "null" }
    | { tag: "int" }
    | {
        tag: "fn";
        item: ast.Item;
        kind: ast.FnItem;
        params: Ty[];
        returnTy: Ty;
    };
