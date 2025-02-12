import * as ast from "@slige/ast";
import { IdentId } from "@slige/common";

export type Ty = {
    kind: TyKind;
};

export const Ty = (kind: TyKind): Ty => ({ kind });

export type TyKind =
    | { tag: "error" }
    | { tag: "unknown" }
    | { tag: "null" }
    | { tag: "int" }
    | { tag: "bool" }
    | {
        tag: "fn";
        item: ast.Item;
        kind: ast.FnItem;
        params: Ty[];
        returnTy: Ty;
    }
    | {
        tag: "struct";
        item: ast.Item;
        kind: ast.StructItem;
        data: VariantData;
    };

export type VariantData =
    | { tag: "error" }
    | { tag: "unit" }
    | { tag: "tuple"; elems: ElemDef[] }
    | { tag: "struct"; fields: FieldDef[] };

export type ElemDef = {
    ty: Ty;
    pub: boolean;
};

export type FieldDef = {
    ident: IdentId;
    ty: Ty;
    pub: boolean;
};
