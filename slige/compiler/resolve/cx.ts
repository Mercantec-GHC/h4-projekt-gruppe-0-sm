import * as ast from "@slige/ast";
import { AstId, IdBase, IdentId, IdMap, Res } from "@slige/common";

export interface Syms {
    getVal(ident: ast.Ident): Resolve;
    getTy(ident: ast.Ident): Resolve;

    defVal(ident: ast.Ident, kind: ResolveKind): Res<void, Redef>;
    defTy(ident: ast.Ident, kind: ResolveKind): Res<void, Redef>;
}

export type Resolve = {
    ident: ast.Ident;
    kind: ResolveKind;
};

export type ResolveKind =
    | { tag: "error" }
    | { tag: "fn"; item: ast.Item; kind: ast.FnItem }
    | { tag: "local"; id: LocalId };

export type PatResolve =
    | { tag: "param"; paramIdx: number }
    | { tag: "let"; stmt: ast.Stmt; kind: ast.LetStmt };

export type LocalId = IdBase & { readonly _: unique symbol };

export type Local =
    | { tag: "param"; paramIdx: number }
    | { tag: "let"; stmt: ast.Stmt; kind: ast.LetStmt };

export const ResolveError = (ident: ast.Ident): Resolve => ({
    ident,
    kind: { tag: "error" },
});

export type Redef = {
    ident: ast.Ident;
};

export class SymsOneNsTab {
    private defs = new IdMap<IdentId, Resolve>();

    public get(ident: ast.Ident): Resolve | undefined {
        return this.defs.get(ident.id)!;
    }

    public def(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        if (this.defs.has(ident.id)) {
            return Res.Err({ ident: this.defs.get(ident.id)!.ident });
        }
        this.defs.set(ident.id, { ident, kind });
        return Res.Ok(undefined);
    }
}

export class SymsNsTab {
    private vals = new SymsOneNsTab();
    private tys = new SymsOneNsTab();

    public getVal(ident: ast.Ident): Resolve | undefined {
        return this.vals.get(ident);
    }
    public getTy(ident: ast.Ident): Resolve | undefined {
        return this.tys.get(ident);
    }

    public defVal(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.vals.def(ident, kind);
    }
    public defTy(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.tys.def(ident, kind);
    }
}

export class RootSyms implements Syms {
    private syms = new SymsNsTab();

    getVal(ident: ast.Ident): Resolve {
        return this.syms.getVal(ident) || ResolveError(ident);
    }
    getTy(ident: ast.Ident): Resolve {
        return this.syms.getTy(ident) || ResolveError(ident);
    }

    defVal(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.syms.defVal(ident, kind);
    }
    defTy(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.syms.defTy(ident, kind);
    }
}

export class FnSyms implements Syms {
    private syms = new SymsNsTab();

    public constructor(
        private parent: Syms,
    ) {}

    getVal(ident: ast.Ident): Resolve {
        const res = this.syms.getVal(ident) || this.parent.getVal(ident);
        if (res.kind.tag === "local") {
            return ResolveError(ident);
        }
        return res;
    }
    getTy(ident: ast.Ident): Resolve {
        return this.syms.getTy(ident) || this.parent.getTy(ident);
    }
    defVal(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.syms.defVal(ident, kind);
    }
    defTy(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.syms.defTy(ident, kind);
    }
}

export class LocalSyms implements Syms {
    private syms = new SymsNsTab();

    public constructor(
        private parent: Syms,
    ) {}

    getVal(ident: ast.Ident): Resolve {
        return this.syms.getVal(ident) || this.parent.getVal(ident);
    }
    getTy(ident: ast.Ident): Resolve {
        return this.syms.getTy(ident) || this.parent.getTy(ident);
    }
    defVal(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.syms.defVal(ident, kind);
    }
    defTy(ident: ast.Ident, kind: ResolveKind): Res<void, Redef> {
        return this.syms.defTy(ident, kind);
    }
}
