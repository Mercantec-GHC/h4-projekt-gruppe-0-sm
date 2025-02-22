import { Ctx, exhausted } from "@slige/common";
import { Ty, VariantData } from "./ty.ts";

export function tyToString(ctx: Ctx, ty: Ty): string {
    const k = ty.kind;
    switch (k.tag) {
        case "error":
            return `<error>`;
        case "unknown":
            return `<unknown>`;
        case "null":
            return `null`;
        case "int":
            return `int`;
        case "bool":
            return `bool`;
        case "fn": {
            const identText = ctx.identText(k.item.ident.id);
            const params = k.params
                .map((param) => tyToString(ctx, param))
                .join(", ");
            const reTy = tyToString(ctx, k.returnTy);
            return `fn ${identText}(${params}) -> ${reTy}`;
        }
        case "enum": {
            const identText = ctx.identText(k.item.ident.id);
            return identText;
        }
        case "struct": {
            const identText = ctx.identText(k.item.ident.id);
            return identText;
        }
    }
    exhausted(k);
}
