import { IdBase, IdMap } from "@slige/common";
import * as mir from "./mir.ts";
import { BlockId } from "./mir.ts";

export type Fn = {
    mirFn: mir.Fn;
    blocks: IdMap<BlockId, Block>;
    locals: IdMap<LocalId, Local>;
};

export type LocalId = IdBase & { readonly _: unique symbol };

export type Local = {
    id: LocalId;
    base: mir.LocalId;
    version: number;
};

export type Block = {
    id: mir.BlockId;
    stmts: Stmt[];
    ter: Ter;
};

export type Stmt = {
    kind: StmtKind;
};

export type StmtKind =
    | { tag: "error" }
    | { tag: "assign"; local: LocalId; rval: RVal };

export type Ter = {
    kind: TerKind;
};

export type TerKind =
    | { tag: "error" }
    | { tag: "goto"; target: BlockId }
    | {
        tag: "switch";
        discr: RVal;
        targets: SwitchTarget[];
        otherwise: BlockId;
    }
    | { tag: "return" };

export type SwitchTarget = {
    value: number;
    target: BlockId;
};

export type PhiSource = {
    local: LocalId;
    branch: BlockId;
};

export type RVal =
    | { tag: "error" }
    | { tag: "phi"; sources: PhiSource[] }
    | { tag: "use"; local: LocalId }
    | { tag: "const"; val: mir.Const };
