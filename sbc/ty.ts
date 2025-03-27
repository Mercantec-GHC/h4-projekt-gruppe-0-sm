import * as ast from "./ast.ts";

export type Ty =
    | { tag: "error" }
    | { tag: "unknown" }
    | { tag: "void" }
    | { tag: "int" }
    | { tag: "str" }
    | { tag: "ptr"; ty: Ty }
    | { tag: "fn"; stmt: ast.Stmt; params: Ty[]; returnTy: Ty };

type TyToStringOpts = {
    short?: boolean;
};

export function tyToString(ty: Ty, opts: TyToStringOpts = {}): string {
    switch (ty.tag) {
        case "error":
            return `<error>`;
        case "unknown":
            return `<unknown>`;
        case "void":
            return `()`;
        case "int":
            return `int`;
        case "str":
            return `str`;
        case "ptr":
            return `*${tyToString(ty.ty)}`;
        case "fn": {
            if (!opts.short) {
                const k = ty.stmt.kind as ast.StmtKind & { tag: "fn" };
                const params = ty.params
                    .map((param, i) =>
                        `${k.params[i].ident}: ${tyToString(param)}`
                    )
                    .join(", ");
                const returnTy = tyToString(ty.returnTy);
                return `fn ${k.ident}(${params}) -> ${returnTy}`;
            } else {
                const k = ty.stmt.kind as ast.StmtKind & { tag: "fn" };
                const params = ty.params
                    .map((param) => tyToString(param))
                    .join(", ");
                const returnTy = tyToString(ty.returnTy);
                return `fn(${params}) -> ${returnTy}`;
            }
        }
    }
}
