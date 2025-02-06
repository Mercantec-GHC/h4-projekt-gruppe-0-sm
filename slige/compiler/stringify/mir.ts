import {
    Block,
    BlockId,
    Const,
    Fn,
    Local,
    LocalId,
    Operand,
    Place,
    ProjElem,
    RVal,
    Stmt,
    StmtKind,
    Ter,
} from "@slige/middle";
import { Ctx, exhausted, IdMap, todo } from "@slige/common";
import { Checker } from "@slige/check";
import { Ty, tyToString } from "@slige/ty";

export class MirFnStringifyer {
    private blockIds = new IdMap<BlockId, number>();
    private localIds = new IdMap<LocalId, number>();

    public constructor(
        private ctx: Ctx,
    ) {}

    public fn(fn: Fn): string {
        return `fn ${fn.label} {\n${
            fn.locals.values().toArray()
                .map((local) => this.localDef(local))
                .join("\n")
        }\n${
            fn.blocks.values().toArray()
                .map((block) => this.block(block))
                .join("\n")
        }\n}`.replaceAll("#", "    ");
    }

    private localDef(local: Local): string {
        const id = this.localIds.size;
        this.localIds.set(local.id, id);
        return `#let %${id}: ${tyToString(this.ctx, local.ty)}`;
    }

    private block(block: Block): string {
        const id = this.blockIds.size;
        this.blockIds.set(block.id, id);
        return `#.b${id}: {\n${
            block.stmts
                .map((stmt) => this.stmt(stmt))
                .join("\n")
        }\n${this.ter(block.terminator)}\n#}`;
    }

    private stmt(stmt: Stmt): string {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                return "##<error>;";
            case "assign":
                return `##${this.place(k.place)} = ${this.rval(k.rval)}`;
            case "fake_read":
            case "deinit":
            case "live":
            case "dead":
            case "mention":
                return todo();
        }
        exhausted(k);
    }

    private ter(ter: Ter): string {
        const k = ter.kind;
        switch (k.tag) {
            case "unset":
                return "##<unset>;";
            case "goto":
            case "switch":
                return todo(k.tag);
            case "return":
                return `##return;`;
            case "unreachable":
            case "drop":
                return todo(k.tag);
        }
        exhausted(k);
    }

    private place(place: Place): string {
        return this.placeWithProj(place.local, place.proj);
    }

    private placeWithProj(local: LocalId, elems: ProjElem[]): string {
        if (elems.length === 0) {
            return this.local(local);
        }
        const elem = elems[0];
        const tail = elems.slice(1);
        switch (elem.tag) {
            case "deref":
                return `*${this.placeWithProj(local, tail)}`;
            case "field":
                return `${this.placeWithProj(local, tail)}.${elem.fieldIdx}`;
            case "index":
                return `${this.placeWithProj(local, tail)}[${
                    this.local(elem.local)
                }]`;
            case "downcast":
                return todo();
        }
        exhausted(elem);
    }

    private rval(rval: RVal): string {
        switch (rval.tag) {
            case "error":
                return "<error>";
            case "use":
                return `${this.operand(rval.operand)}`;
            case "repeat":
            case "ref":
            case "ptr":
                return todo(rval.tag);
            case "binary":
                return `${this.operand(rval.left)} ${rval.binaryType} ${
                    this.operand(rval.right)
                }`;
            case "unary":
                return todo(rval.tag);
            case "call":
                return `${this.operand(rval.func)}(${
                    rval.args.map((arg) => this.operand(arg)).join(", ")
                })`;
        }
        exhausted(rval);
    }

    private operand(operand: Operand): string {
        switch (operand.tag) {
            case "copy":
                return `copy ${this.place(operand.place)}`;
            case "move":
                return `move ${this.place(operand.place)}`;
            case "const":
                return `${this.constVal(operand.val)}`;
        }
        exhausted(operand);
    }

    private constVal(val: Const): string {
        switch (val.tag) {
            case "null":
                return `null`;
            case "int":
                return `${val.value}`;
            case "bool":
                return `${val.value}`;
            case "string":
                return `"${val.value}"`;
        }
        exhausted(val);
    }

    private local(local: LocalId): string {
        return `%${this.localIds.get(local)!}`;
    }
}
