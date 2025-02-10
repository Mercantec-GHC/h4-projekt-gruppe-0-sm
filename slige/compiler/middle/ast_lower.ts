import * as ast from "@slige/ast";
import { Checker } from "@slige/check";
import { AstId, Ctx, exhausted, IdMap, Ids, Res, todo } from "@slige/common";
import { Resols } from "@slige/resolve";
import { Ty } from "@slige/ty";
import { BinaryType, Operand, ProjElem, StmtKind, TerKind } from "./mir.ts";
import { Block, BlockId, Fn, Local, LocalId, RVal } from "./mir.ts";
import { MirFnStringifyer } from "@slige/stringify";

export class AstLowerer implements ast.Visitor {
    private fns = new IdMap<AstId, Fn>();

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
        const fn = new FnLowerer(this.ctx, this.re, this.ch, item, kind)
            .lower();
        if (fn.ok) {
            this.fns.set(item.id, fn.val);
        }
    }

    public mirString(): string {
        return this.fns.values()
            .map((fn) => new MirFnStringifyer(this.ctx).fn(fn))
            .toArray()
            .join("\n");
    }
}

export class FnLowerer {
    private localIds = new Ids<LocalId>();
    private locals = new IdMap<LocalId, Local>();

    private blockIds = new Ids<BlockId>();
    private blocks = new IdMap<BlockId, Block>();

    private currentBlock?: Block;

    private reLocals = new IdMap<AstId, LocalId>();

    private paramLocals = new IdMap<LocalId, number>();

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
        if (fnTy.kind.tag !== "fn") {
            throw new Error();
        }
        const returnPlace = this.local(fnTy.kind.returnTy);
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
            entry: entry.id,
            paramLocals: this.paramLocals,
            astItem: this.item,
            astItemKind: this.kind,
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
                return todo(k.tag);
            case "let":
                return this.lowerLetStmt(stmt, k);
            case "return":
            case "break":
            case "continue":
            case "assign":
                return todo(k.tag);
            case "expr": {
                const rval = this.lowerExpr(k.expr);
                // ignore the fuck out of the value
                void rval;
                return;
            }
        }
        exhausted(k);
    }

    private lowerLetStmt(_stmt: ast.Stmt, kind: ast.LetStmt) {
        const val = kind.expr && this.lowerExpr(kind.expr);
        this.allocatePat(kind.pat);
        if (val) {
            this.assignPatRVal(kind.pat, val);
        }
    }

    private allocatePat(pat: ast.Pat) {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return;
            case "bind": {
                const ty = this.ch.patTy(pat);
                const local = this.local(ty, k.ident);
                this.reLocals.set(pat.id, local);
                return;
            }
            case "path":
                return todo();
        }
        exhausted(k);
    }

    private assignPatRVal(pat: ast.Pat, rval: RVal) {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return;
            case "bind": {
                const patLocal = this.reLocals.get(pat.id)!;
                this.addStmt({
                    tag: "assign",
                    place: { local: patLocal, proj: [] },
                    rval,
                });
                return;
            }
            case "path":
                return todo();
        }
        exhausted(k);
    }

    private assignPat(pat: ast.Pat, local: LocalId, proj: ProjElem[] = []) {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return;
            case "bind": {
                const patLocal = this.reLocals.get(pat.id)!;
                this.addStmt({
                    tag: "assign",
                    place: { local: patLocal, proj: [] },
                    rval: {
                        tag: "use",
                        operand: { tag: "move", place: { local, proj } },
                    },
                });
                return;
            }
            case "path":
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
                return {
                    tag: "use",
                    operand: this.lowerExprToOperand(expr),
                };
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
                return todo(k.tag);
            case "call":
                return this.lowerCallExpr(expr, k);
            case "unary":
                return todo(k.tag);
            case "binary":
                return this.lowerBinaryExpr(expr, k);
            case "block":
                return this.lowerBlock(k.block);
            case "if":
                return this.lowerIfExpr(expr, k);
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
            case "local":
                return {
                    tag: "use",
                    operand: this.lowerPathExprToOperand(expr, kind),
                };
        }
        exhausted(re.kind);
    }

    private lowerCallExpr(expr: ast.Expr, kind: ast.CallExpr): RVal {
        const args = kind.args.map((arg) => this.lowerExprToOperand(arg));
        const func = this.lowerExprToOperand(kind.expr);
        return { tag: "call", func, args };
    }

    private lowerBinaryExpr(expr: ast.Expr, kind: ast.BinaryExpr): RVal {
        const left = this.lowerExprToOperand(kind.left);
        const right = this.lowerExprToOperand(kind.right);
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

    private lowerIfExpr(expr: ast.Expr, kind: ast.IfExpr): RVal {
        const cond = this.lowerExprToOperand(kind.cond);
        const condBlock = this.currentBlock!;
        if (kind.falsy) {
            return todo();
        } else {
            if (this.ch.exprTy(expr).kind.tag !== "null") {
                throw new Error();
            }
            const truthBlock = this.pushBlock();
            this.lowerExpr(kind.truthy);
            const exit = this.pushBlock();
            this.setTer({ tag: "goto", target: exit.id }, truthBlock);
            this.setTer({
                tag: "switch",
                discr: cond,
                targets: [{ value: 1, target: truthBlock.id }],
                otherwise: exit.id,
            }, condBlock);
            return {
                tag: "use",
                operand: { tag: "const", val: { tag: "null" } },
            };
        }
    }

    private lowerExprToOperand(expr: ast.Expr): Operand {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                return { tag: "error" };
            case "path":
                return this.lowerPathExprToOperand(expr, k);
            case "null":
                return { tag: "const", val: { tag: "null" } };
            case "int":
                return {
                    tag: "const",
                    val: { tag: "int", value: k.value },
                };
            case "bool":
                return {
                    tag: "const",
                    val: { tag: "int", value: k.value ? 1 : 0 },
                };
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
            case "binary":
            case "block":
            case "if":
            case "loop":
            case "while":
            case "for":
            case "c_for": {
                const ty = this.ch.exprTy(expr);
                const rval = this.lowerExpr(expr);
                const local = this.local(ty);
                this.addStmt({
                    tag: "assign",
                    place: { local, proj: [] },
                    rval,
                });
                return { tag: "move", place: { local, proj: [] } };
            }
        }
        exhausted(k);
    }

    private lowerPathExprToOperand(
        expr: ast.Expr,
        kind: ast.PathExpr,
    ): Operand {
        const re = this.re.exprRes(expr.id);
        switch (re.kind.tag) {
            case "error":
                return { tag: "error" };
            case "local": {
                const patRes = this.re.patRes(re.kind.id);
                const ty = this.ch.exprTy(expr);
                let local: LocalId;
                if (this.reLocals.has(re.kind.id)) {
                    local = this.reLocals.get(re.kind.id)!;
                } else {
                    local = this.local(ty);
                    this.reLocals.set(re.kind.id, local);
                }
                if (patRes.kind.tag === "fn_param") {
                    this.paramLocals.set(local, patRes.kind.paramIdx);
                }
                const isCopyable = (() => {
                    switch (ty.kind.tag) {
                        case "error":
                        case "unknown":
                            return false;
                        case "null":
                        case "int":
                        case "bool":
                            return true;
                        case "fn":
                            return false;
                    }
                    exhausted(ty.kind);
                })();
                return {
                    tag: isCopyable ? "copy" : "move",
                    place: { local, proj: [] },
                };
            }
            case "fn": {
                const { item, kind } = re.kind;
                return { tag: "const", val: { tag: "fn", item, kind } };
            }
        }
        exhausted(re.kind);
    }

    private local(ty: Ty, ident?: ast.Ident): LocalId {
        const id = this.localIds.nextThenStep();
        this.locals.set(id, { id, ty, ident });
        return id;
    }

    private pushBlock(): Block {
        const id = this.blockIds.nextThenStep();
        const block: Block = {
            id,
            stmts: [],
            terminator: { kind: { tag: "unset" } },
        };
        this.blocks.set(id, block);
        this.currentBlock = block;
        return block;
    }

    private setTer(kind: TerKind, block = this.currentBlock!) {
        block.terminator = { kind };
    }

    private addStmt(kind: StmtKind, block = this.currentBlock!) {
        block.stmts.push({ kind });
    }
}

function unpack(blocks: Block[], val: [Block[], RVal]): [Block[], RVal] {
    return [[...blocks, ...val[0]], val[1]];
}
