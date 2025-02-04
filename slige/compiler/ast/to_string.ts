import { Ctx, exhausted, todo } from "@slige/common";
import { Block, Item } from "./ast.ts";

export function itemToString(ctx: Ctx, item: Item): string {
    const ident = ctx.identText(item.ident.id);
    const k = item.kind;
    switch (k.tag) {
        case "error":
            return `<error>`;
        case "mod_block": {
            const block = blockToString(ctx, k.block);
            return `mod ${item} ${block}`;
        }
        case "mod_file":
            return todo();
        case "enum":
            return todo();
        case "struct":
            return todo();
        case "fn":
            return todo();
        case "use":
            return todo();
        case "type_alias":
            return todo();
    }
    return exhausted(k);
}

export function blockToString(ctx: Ctx, block: Block): string {
    return todo();
}
