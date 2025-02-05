import * as ast from "@slige/ast";
import { Checker } from "@slige/check";
import { AstId, Ctx, exhausted, IdMap, Ids, Res, todo } from "@slige/common";
import { Resols } from "@slige/resolve";
import { Ty } from "@slige/ty";
import { BinaryType, Operand, StmtKind, TerKind } from "./mir.ts";
import { Block, BlockId, Fn, Local, LocalId, RVal, Stmt, Ter } from "./mir.ts";

export class AstLowerer implements ast.Visitor {
    public constructor(
        private ctx: Ctx,
        private re: Resols,
        private ch: Checker,
        private ast: ast.File,
    ) {}

    public lower() {
        ast.visitFile(this, this.ast);
    }

    visitFnItem(item: ast.Item, kind: ast.FnItem): ast.VisitRes {
        new FnLowerer(this.ctx, this.re, this.ch, item, kind).lower();
    }
}

export class FnLowerer {
    private localIds = new Ids<LocalId>();
    private locals = new IdMap<LocalId, Local>();

    private blockIds = new Ids<BlockId>();
    private blocks = new IdMap<BlockId, Block>();

    private currentBlock?: Block;

    private reLocals = new IdMap<AstId, LocalId>();

    public constructor(
        private ctx: Ctx,
        private re: Resols,
        private ch: Checker,
        private item: ast.Item,
        private kind: ast.FnItem,
    ) {}

    public lower(): Res<Fn, string> {
        const entry = this.pushBlock();

        const fnTy = this.ch.fnItemTy(this.item, this.kind);
        const returnPlace = this.local(fnTy);
        const returnVal = this.lowerBlock(this.kind.body!);

        this.addStmt({
            tag: "assign",
            place: { local: returnPlace, proj: [] },
            rval: returnVal,
        });

        this.setTer({ tag: "return" });

        return Res.Ok({
            label: this.ctx.identText(this.item.ident.id),
            locals: this.locals,
            blocks: this.blocks,
            entry,
        });
    }

    private lowerBlock(block: ast.Block): RVal {
        for (const stmt of block.stmts) {
            this.lowerStmt(stmt);
        }
        return block.expr && this.lowerExpr(block.expr) || {
            tag: "use",
            operand: { tag: "const", val: { tag: "null" } },
        };
    }

    private lowerStmt(stmt: ast.Stmt) {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                return { tag: "error" };
            case "item":
            case "let":
            case "return":
            case "break":
            case "continue":
            case "assign":
            case "expr":
                return todo();
        }
        exhausted(k);
    }

    private lowerExpr(expr: ast.Expr): RVal {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                return { tag: "error" };
            case "path":
                return this.lowerPathExpr(expr, k);
            case "null":
            case "int":
            case "bool":
            case "str":
            case "group":
            case "array":
            case "repeat":
            case "struct":
            case "ref":
            case "deref":
            case "elem":
            case "field":
            case "index":
            case "call":
            case "unary":
                return todo(k.tag);
            case "binary":
                return this.lowerBinaryExpr(expr, k);
            case "block":
            case "if":
            case "loop":
            case "while":
            case "for":
            case "c_for":
                return todo(k.tag);
        }
        exhausted(k);
    }

    private lowerPathExpr(expr: ast.Expr, kind: ast.PathExpr): RVal {
        const re = this.re.exprRes(expr.id);
        switch (re.kind.tag) {
            case "error":
                return { tag: "error" };
            case "fn":
                return todo();
            case "local": {
                const ty = this.ch.exprTy(expr);
                const local = this.local(ty);
                this.reLocals.set(re.kind.id, local);
                const isCopyable = (() => {
                    switch (ty.kind.tag) {
                        case "error":
                        case "unknown":
                            return false;
                        case "null":
                        case "int":
                            return true;
                        case "fn":
                            return false;
                    }
                    exhausted(ty.kind);
                })();
                return {
                    tag: "use",
                    operand: {
                        tag: isCopyable ? "copy" : "move",
                        place: { local, proj: [] },
                    },
                };
            }
        }
        exhausted(re.kind);
    }

    private lowerBinaryExpr(expr: ast.Expr, kind: ast.BinaryExpr): RVal {
        const left = this.rvalAsOperand(
            this.lowerExpr(kind.left),
            this.ch.exprTy(kind.left),
        );
        const right = this.rvalAsOperand(
            this.lowerExpr(kind.right),
            this.ch.exprTy(kind.right),
        );
        const binaryType = ((kind): BinaryType => {
            switch (kind.binaryType) {
                case "+":
                    return "add";
                case "-":
                    return "sub";
                case "*":
                    return "mul";
                case "/":
                    return "div";
                case "==":
                    return "eq";
                case "!=":
                    return "ne";
                case "<":
                    return "lt";
                case ">":
                    return "lte";
                case "<=":
                    return "lte";
                case ">=":
                    return "gte";
                case "or":
                    return "or";
                case "and":
                    return "and";
            }
            return todo(kind.binaryType);
        })(kind);
        return { tag: "binary", binaryType, left, right };
    }

    private rvalAsOperand(rval: RVal, ty: Ty): Operand {
        const local = this.local(ty);
        this.addStmt({ tag: "assign", place: { local, proj: [] }, rval });
        return { tag: "move", place: { local, proj: [] } };
    }

    private local(ty: Ty): LocalId {
        const id = this.localIds.nextThenStep();
        this.locals.set(id, { id, ty });
        return id;
    }

    private pushBlock(): BlockId {
        const id = this.blockIds.nextThenStep();
        const block: Block = {
            id,
            stmts: [],
            terminator: { kind: { tag: "unset" } },
        };
        this.blocks.set(id, block);
        this.currentBlock = block;
        return id;
    }

    private setTer(kind: TerKind) {
        this.currentBlock!.terminator = { kind };
    }

    private addStmt(kind: StmtKind) {
        this.currentBlock!.stmts.push({ kind });
    }
}

function unpack(blocks: Block[], val: [Block[], RVal]): [Block[], RVal] {
    return [[...blocks, ...val[0]], val[1]];
}
