import { BlockId, lir, mir } from "@slige/middle";
import { Ctx, exhausted, IdMap, todo } from "@slige/common";
import { Ty, tyToString } from "@slige/ty";

export class LirFnStringifyer {
    private blockIds = new IdMap<BlockId, number>();
    private localIds = new IdMap<lir.LocalId, number>();

    public constructor(
        private ctx: Ctx,
    ) {}

    public fn(fn: lir.Fn): string {
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
        const blocks = fn.blocks
            .values()
            .toArray()
            .map((block) => this.block(block))
            .join("\n");
        return `fn ${fn.mirFn.label} {\n${blocks}\n}`
            .replaceAll("#", "    ");
    }

    private block(block: lir.Block): string {
        const id = this.blockIds.get(block.id);
        return `#.b${id}: {\n${
            [
                ...block.stmts
                    .map((stmt) => this.stmt(stmt)),
                this.ter(block.ter),
            ]
                .join("\n")
        }\n#}`;
    }

    private stmt(stmt: lir.Stmt): string {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                return "##<error>;";
            case "assign":
                return `##${this.local(k.local)} = ${this.rval(k.rval)}`;
        }
        exhausted(k);
    }

    private ter(ter: lir.Ter): string {
        const k = ter.kind;
        switch (k.tag) {
            case "error":
                return "##<error>;";
            case "goto":
                return `##goto ${this.blockId(k.target)}`;
            case "switch": {
                const discr = this.rval(k.discr);
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
        }
        exhausted(k);
    }

    private rval(rval: lir.RVal): string {
        switch (rval.tag) {
            case "error":
                return "<error>";
            case "phi":
                return `phi [${
                    rval.sources
                        .map((src) =>
                            `(${this.blockId(src.branch)}, ${
                                this.local(src.local)
                            })`
                        )
                        .join(",")
                }]`;
            case "use":
                return this.local(rval.local);
            case "const":
                return `${this.constVal(rval.val)}`;
        }
    }

    private constVal(val: mir.Const): string {
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

    private local(local: lir.LocalId): string {
        return `%${this.localIds.get(local)!}`;
    }
}
