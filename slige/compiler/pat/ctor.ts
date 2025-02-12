export type Ctor = {
    kind: CtorKind;
};

export type CtorKind =
    | { tag: "error" }
    | { tag: "struct" };
