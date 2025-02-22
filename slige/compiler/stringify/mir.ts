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
    Ter,
} from "@slige/middle";
import { Ctx, exhausted, IdMap, todo } from "@slige/common";
import { Ty, tyToString } from "@slige/ty";

export class MirFnStringifyer {
    private blockIds = new IdMap<BlockId, number>();
    private localIds = new IdMap<LocalId, number>();

    public constructor(
        private ctx: Ctx,
    ) {}

    public fn(fn: Fn): string {
        for (
            const [idx, id] of fn.blocks
                .keys()
                .toArray()
                .entries()
        ) {
            this.blockIds.set(id, idx);
        }
        for (
            const [idx, id] of fn.locals
                .keys()
                .toArray()
                .entries()
        ) {
            this.localIds.set(id, idx);
        }
        const locals = fn.locals.values().toArray();
        const paramsStr = locals
            .filter((local) => fn.paramLocals.has(local.id))
            .map((local) => [local, fn.paramLocals.get(local.id)!] as const)
            .toSorted((a, b) => a[1] - b[1])
            .map(([local]) => fn.locals.get(local.id)!)
            .map((local) => this.localDef(local))
            .join(", ");
        const localsStr = locals
            .filter((local) => !fn.paramLocals.has(local.id))
            .map((local) => `#let ${this.localDef(local)}`)
            .join("\n");
        const blocks = fn.blocks
            .values()
            .toArray()
            .map((block) => this.block(block))
            .join("\n");
        return `fn ${fn.label}(${paramsStr}) {\n${localsStr}\n${blocks}\n}`
            .replaceAll("#", "    ");
    }

    private localDef(local: Local): string {
        const ident = local.ident && ` // ${local.ident.text}` || "";
        const mut = local.mut ? "mut " : "";
        return `${mut}${this.local(local.id)}: ${this.ty(local.ty)}${ident}`;
    }

    private block(block: Block): string {
        const id = this.blockIds.get(block.id);
        return `#.b${id}: {\n${
            [
                ...block.stmts
                    .map((stmt) => this.stmt(stmt)),
                this.ter(block.terminator),
            ]
                .join("\n")
        }\n#}`;
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
                return `##goto ${this.blockId(k.target)}`;
            case "switch": {
                const discr = this.operand(k.discr);
                const targets = k.targets
                    .map((target) =>
                        `\n###${target.value} => ${this.blockId(target.target)}`
                    )
                    .join("");
                const otherwise = this.blockId(k.otherwise);
                return `##switch ${discr}${targets}\n###_ => ${otherwise}`;
            }
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
            case "binary": {
                const op = rval.binaryType;
                const left = this.operand(rval.left);
                const right = this.operand(rval.right);
                return `${op}(${left}, ${right})`;
            }
            case "unary":
                return todo(rval.tag);
            case "adt": {
                const tyk = rval.ty.kind;
                if (tyk.tag === "struct") {
                    const datak = tyk.kind.data.kind;
                    switch (datak.tag) {
                        case "error":
                            return "<error>";
                        case "unit":
                            return todo();
                        case "tuple": {
                            const name = tyk.item.ident.text;
                            const fields = rval.fields
                                .map((field, idx) => this.operand(field))
                                .join(", ");
                            return `${name}(${fields})`;
                        }
                        case "struct": {
                            const name = tyk.item.ident.text;
                            const fields = rval.fields
                                .map((field, idx) =>
                                    `${datak.fields[idx].ident!.text}: ${
                                        this.operand(field)
                                    }`
                                )
                                .join(", ");
                            return `${name} { ${fields} }`;
                        }
                    }
                    return exhausted(datak);
                } else if (tyk.tag === "enum") {
                    const datak = rval.variant!.data.kind;
                    switch (datak.tag) {
                        case "error":
                            return "<error>";
                        case "unit":
                            return todo();
                        case "tuple": {
                            const name = `${tyk.item.ident.text}::${
                                rval.variant!.ident.text
                            }`;
                            const fields = rval.fields
                                .map((field, idx) => this.operand(field))
                                .join(", ");
                            return `${name}(${fields})`;
                        }
                        case "struct": {
                            const name = tyk.item.ident.text;
                            const fields = rval.fields
                                .map((field, idx) =>
                                    `${datak.fields[idx].ident!.text}: ${
                                        this.operand(field)
                                    }`
                                )
                                .join(", ");
                            return `${name} { ${fields} }`;
                        }
                    }
                    return exhausted(datak);
                } else {
                    return todo();
                }
            }
            case "call":
                return `call ${this.operand(rval.func)}(${
                    rval.args.map((arg) => this.operand(arg)).join(", ")
                })`;
        }
        exhausted(rval);
    }

    private operand(operand: Operand): string {
        switch (operand.tag) {
            case "error":
                return `<error>`;
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
            case "str":
                return `"${val.value}"`;
            case "fn":
                return `${val.item.ident.text}`;
        }
        exhausted(val);
    }

    private blockId(id: BlockId): string {
        return `.b${this.blockIds.get(id)!}`;
    }

    private local(local: LocalId): string {
        return `_${this.localIds.get(local)!}`;
    }

    private ty(ty: Ty): string {
        return tyToString(this.ctx, ty);
    }
}
