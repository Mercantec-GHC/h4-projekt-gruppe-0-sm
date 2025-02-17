import { IdBase, IdMap } from "@slige/common";
import * as ast from "@slige/ast";
import { Ty } from "@slige/ty";

export type Fn = {
    label: string;
    locals: IdMap<LocalId, Local>;
    blocks: IdMap<BlockId, Block>;
    entry: BlockId;
    paramLocals: IdMap<LocalId, number>;
    astItem: ast.Item;
    astItemKind: ast.FnItem;
};

export type LocalId = IdBase & { readonly _: unique symbol };

export type Local = {
    id: LocalId;
    ty: Ty;
    mut: boolean;
    ident?: ast.Ident;
};

export type BlockId = IdBase & { readonly _: unique symbol };

export type Block = {
    id: BlockId;
    stmts: Stmt[];
    terminator: Ter;
};

export type Stmt = {
    kind: StmtKind;
};

export type StmtKind =
    | { tag: "error" }
    | { tag: "assign"; place: Place; rval: RVal }
    | { tag: "fake_read"; place: Place }
    | { tag: "deinit"; place: Place }
    | { tag: "live"; local: LocalId }
    | { tag: "dead"; local: LocalId }
    | { tag: "mention"; place: Place };

export type Ter = {
    kind: TerKind;
};

export type TerKind =
    | { tag: "unset" }
    | { tag: "goto"; target: BlockId }
    | {
        tag: "switch";
        discr: Operand;
        targets: SwitchTarget[];
        otherwise: BlockId;
    }
    | { tag: "return" }
    | { tag: "unreachable" }
    | { tag: "drop"; place: Place; target: BlockId };

export type SwitchTarget = {
    value: number;
    target: BlockId;
};

export type Place = {
    local: LocalId;
    proj: ProjElem[];
};

// https://doc.rust-lang.org/beta/nightly-rustc/rustc_middle/mir/type.PlaceElem.html
export type ProjElem =
    | { tag: "deref" }
    | { tag: "field"; fieldIdx: number }
    | { tag: "index"; local: LocalId }
    | { tag: "downcast"; variantIdx: number };

// https://doc.rust-lang.org/beta/nightly-rustc/rustc_middle/mir/enum.Rvalue.html
export type RVal =
    | { tag: "error" }
    | { tag: "use"; operand: Operand }
    | { tag: "repeat"; operand: Operand; length: Const }
    | { tag: "ref"; place: Place; mut: boolean }
    | { tag: "ptr"; place: Place; mut: boolean }
    | { tag: "binary"; binaryType: BinaryType; left: Operand; right: Operand }
    | { tag: "unary"; unaryType: UnaryType; operand: Operand }
    | { tag: "struct"; ty: Ty; fields: Operand[] }
    | { tag: "call"; func: Operand; args: Operand[] };

export type BinaryType =
    | "add"
    | "sub"
    | "mul"
    | "div"
    | "rem"
    | "xor"
    | "and"
    | "or"
    | "shl"
    | "shr"
    | "eq"
    | "ne"
    | "lt"
    | "lte"
    | "gt"
    | "gte";

export type UnaryType = "not" | "neg";

export type Operand =
    | { tag: "error" }
    | { tag: "copy"; place: Place }
    | { tag: "move"; place: Place }
    | { tag: "const"; val: Const };

export type Const =
    | { tag: "null" }
    | { tag: "int"; value: number }
    | { tag: "str"; value: string }
    | { tag: "fn"; item: ast.Item; kind: ast.FnItem };
