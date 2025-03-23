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

    public toArray(): Fn[] {
        return this.fns.values().toArray();
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

    private loopInfos = new IdMap<AstId, {
        loopBlock: BlockId;
        endBlock: BlockId;
        resultLocal?: LocalId;
    }>();

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
                return todo(k.tag);
            case "break":
                return this.lowerBreakStmt(stmt, k);
            case "continue":
                return todo(k.tag);
            case "assign":
                return this.lowerAssignStmt(stmt, k);
            case "expr": {
                const rval = this.lowerExpr(k.expr);

                // ignore the fuck out of the value
                const ty = this.ch.exprTy(k.expr);
                const local = this.local(ty);
                this.addStmt({
                    tag: "assign",
                    place: { local, proj: [] },
                    rval,
                });

                return;
            }
        }
        exhausted(k);
    }

    private lowerLetStmt(stmt: ast.Stmt, kind: ast.LetStmt) {
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
                const local = k.mut
                    ? this.localMut(ty, k.ident)
                    : this.local(ty, k.ident);
                this.reLocals.set(pat.id, local);
                return;
            }
            case "path":
                return todo();
            case "bool":
                return;
            case "tuple":
            case "struct":
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
            case "bool":
                return;
            case "tuple":
            case "struct":
                return todo();
        }
        exhausted(k);
    }

    private lowerBreakStmt(stmt: ast.Stmt, kind: ast.BreakStmt) {
        this.ch.checkBreakStmt(stmt, kind);
        const re = this.re.loopRes(stmt.id);
        if (re.tag === "error") {
            return;
        }
        const info = this.loopInfos.get(re.expr.id)!;
        if (kind.expr) {
            const ty = this.ch.exprTy(kind.expr);
            info.resultLocal = info.resultLocal ?? this.local(ty);
            const rval = this.lowerExpr(kind.expr);
            this.addStmt({
                tag: "assign",
                place: { local: info.resultLocal, proj: [] },
                rval,
            });
        }
        this.setTer({ tag: "goto", target: info.endBlock });
        this.pushBlock();
    }

    private lowerAssignStmt(stmt: ast.Stmt, kind: ast.AssignStmt) {
        this.ch.checkAssignStmt(stmt, kind);
        const rval = this.lowerExpr(kind.value);
        switch (kind.assignType) {
            case "=":
                return this.assignToExpr(kind.subject, rval, []);
            case "+=":
            case "-=":
                todo();
        }
    }

    private assignToExpr(expr: ast.Expr, rval: RVal, proj: ProjElem[]) {
        const k = expr.kind;
        switch (k.tag) {
            case "path": {
                const re = this.re.exprRes(expr.id);
                if (re.kind.tag !== "local") {
                    throw new Error("cannot assign. checker should catch");
                }
                const patRe = this.re.patRes(re.kind.id);
                const local = this.reLocals.get(patRe.pat.id)!;
                this.addStmt({
                    tag: "assign",
                    place: { local, proj: [] },
                    rval,
                });
                return;
            }
            case "error":
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
            case "binary":
            case "block":
            case "if":
            case "match":
            case "loop":
            case "while":
            case "for":
            case "c_for":
                throw new Error("not assignable. checker should catch");
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
                return todo(k.tag);
            case "struct":
                return this.lowerStructExpr(expr, k);
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
            case "match":
                return this.lowerMatchExpr(expr, k);
            case "loop":
                return this.lowerLoopExpr(expr, k);
            case "while":
                return this.lowerWhileExpr(expr, k);
            case "for":
                return todo(k.tag);
            case "c_for":
                return this.lowerCForExpr(expr, k);
        }
        exhausted(k);
    }

    private lowerPathExpr(expr: ast.Expr, kind: ast.PathExpr): RVal {
        const re = this.re.exprRes(expr.id);
        switch (re.kind.tag) {
            case "error":
                return { tag: "error" };
            case "enum":
            case "struct":
                return todo();
            case "variant": {
                const ty = this.ch.enumItemTy(re.kind.item, re.kind.kind);
                const data = re.kind.variant.data;
                switch (data.kind.tag) {
                    case "error":
                        return { tag: "error" };
                    case "struct":
                        throw new Error("should not check");
                    case "unit":
                        return {
                            tag: "adt",
                            ty,
                            fields: [],
                            variant: re.kind.variant,
                        };
                    case "tuple":
                        return todo();
                }
                return exhausted(data.kind);
            }
            case "field":
                return todo();
            case "fn":
            case "local":
                return {
                    tag: "use",
                    operand: this.lowerPathExprToOperand(expr, kind),
                };
        }
        exhausted(re.kind);
    }

    private lowerStructExpr(expr: ast.Expr, kind: ast.StructExpr): RVal {
        const ty = this.ch.exprTy(expr);
        let variant: ast.Variant | undefined = undefined;
        if (ty.kind.tag === "enum") {
            const res = this.re.pathRes(kind.path!.id);
            if (res.kind.tag !== "variant") {
                throw new Error();
            }
            variant = res.kind.variant;
        }
        const fields = kind.fields
            .map((field) => this.lowerExprToOperand(field.expr));
        return { tag: "adt", ty, fields, variant };
    }

    private lowerCallExpr(expr: ast.Expr, kind: ast.CallExpr): RVal {
        if (this.callExprIsTupleStructCtor(kind)) {
            return this.lowerCallExprTupleStructCtor(expr, kind);
        }
        if (this.callExprIsTupleVariantCtor(kind)) {
            return this.lowerCallExprTupleVariantCtor(expr, kind);
        }
        const args = kind.args.map((arg) => this.lowerExprToOperand(arg));

        const calleeTy = this.ch.exprTy(kind.expr);
        if (calleeTy.kind.tag !== "fn") {
            throw new Error();
        }
        const builtinAttr = calleeTy.kind.item.attrs
            .find((attr) => attr.ident.text === "builtin");
        if (builtinAttr) {
            if (
                builtinAttr.args?.length !== 1 ||
                builtinAttr.args[0].kind.tag !== "path" ||
                builtinAttr.args[0].kind.path.segments.length !== 1 ||
                !["Hello"].includes(
                    builtinAttr.args[0].kind.path.segments[0].ident.text,
                )
            ) {
                return { tag: "error" };
            }
            const builtinId =
                builtinAttr.args[0].kind.path.segments[0].ident.text;
            return { tag: "builtin", builtinId, args };
        }

        const func = this.lowerExprToOperand(kind.expr);
        return { tag: "call", func, args };
    }

    private callExprIsTupleStructCtor(kind: ast.CallExpr): boolean {
        if (kind.expr.kind.tag !== "path") {
            return false;
        }
        const res = this.re.exprRes(kind.expr.id);
        return res.kind.tag === "struct";
    }

    private lowerCallExprTupleStructCtor(
        expr: ast.Expr,
        kind: ast.CallExpr,
    ): RVal {
        const ty = this.ch.exprTy(expr);
        const fields = kind.args
            .map((arg) => this.lowerExprToOperand(arg));
        return { tag: "adt", ty, fields };
    }

    private callExprIsTupleVariantCtor(kind: ast.CallExpr): boolean {
        if (kind.expr.kind.tag !== "path") {
            return false;
        }
        const res = this.re.exprRes(kind.expr.id);
        return res.kind.tag === "variant" &&
            res.kind.variant.data.kind.tag === "tuple";
    }

    private lowerCallExprTupleVariantCtor(
        expr: ast.Expr,
        kind: ast.CallExpr,
    ): RVal {
        const res = this.re.exprRes(kind.expr.id);
        if (res.kind.tag !== "variant") {
            throw new Error();
        }
        const variant = res.kind.variant;
        const ty = this.ch.exprTy(expr);
        const fields = kind.args
            .map((arg) => this.lowerExprToOperand(arg));
        return { tag: "adt", ty, fields, variant };
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
        const ty = this.ch.exprTy(expr);
        const discr = this.lowerExprToOperand(kind.cond);
        const condBlock = this.currentBlock!;
        if (kind.falsy) {
            const local = this.local(ty);

            const truthBlock = this.pushBlock();
            const truthy = this.lowerExpr(kind.truthy);
            this.addStmt({
                tag: "assign",
                place: { local, proj: [] },
                rval: truthy,
            });

            const falsyBlock = this.pushBlock();
            const falsy = this.lowerExpr(kind.falsy);
            this.addStmt({
                tag: "assign",
                place: { local, proj: [] },
                rval: falsy,
            });

            const exit = this.pushBlock();
            this.setTer({ tag: "goto", target: exit.id }, truthBlock);
            this.setTer({ tag: "goto", target: exit.id }, falsyBlock);

            this.setTer({
                tag: "switch",
                discr,
                targets: [{ value: 1, target: truthBlock.id }],
                otherwise: falsyBlock.id,
            }, condBlock);

            return { tag: "use", operand: this.copyOrMoveLocal(local, ty) };
        } else {
            if (this.ch.exprTy(expr).kind.tag !== "null") {
                throw new Error();
            }
            const truthBlock = this.pushBlock();
            this.lowerExpr(kind.truthy);
            const exit = this.createBlock();

            this.setTer({ tag: "goto", target: exit.id });
            this.pushCreatedBlock(exit);

            this.setTer({
                tag: "switch",
                discr,
                targets: [{ value: 1, target: truthBlock.id }],
                otherwise: exit.id,
            }, condBlock);
            return {
                tag: "use",
                operand: { tag: "const", val: { tag: "null" } },
            };
        }
    }

    private lowerMatchExpr(expr: ast.Expr, kind: ast.MatchExpr): RVal {
        if (kind.arms.length === 0) {
            return todo();
        }
        const ty = this.ch.exprTy(expr);
        const dest = this.local(ty);

        const discr = this.lowerExpr(kind.expr);
        const exitBlock = this.createBlock();

        for (const arm of kind.arms) {
            const exprBlock = this.createBlock();
            const nextArmBlock = this.createBlock();
            this.lowerMatchArmPattern(
                discr,
                arm.pat,
                exprBlock,
                nextArmBlock,
            );
            this.pushCreatedBlock(exprBlock);
            this.lowerMatchArmPatternBindings(discr, arm.pat);
            const rval = this.lowerExpr(arm.expr);
            this.addStmt({
                tag: "assign",
                place: { local: dest, proj: [] },
                rval,
            });
            this.setTer({ tag: "goto", target: exitBlock.id });
            this.pushCreatedBlock(nextArmBlock);
        }
        this.setTer({ tag: "goto", target: exitBlock.id });
        this.pushCreatedBlock(exitBlock);
        return { tag: "use", operand: this.copyOrMoveLocal(dest, ty) };
    }

    private lowerMatchArmPattern(
        discr: RVal,
        pat: ast.Pat,
        truthyBlock: Block,
        falsyBlock: Block,
    ) {
        const discrOperand = this.lowerMatchArmPatternCondition(discr, pat);
        this.setTer({
            tag: "switch",
            discr: discrOperand,
            targets: [{ value: 1, target: truthyBlock.id }],
            otherwise: falsyBlock.id,
        });
    }

    private lowerMatchArmPatternCondition(
        discr: RVal,
        pat: ast.Pat,
    ): Operand {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return { tag: "error" };
            case "bind": {
                return { tag: "const", val: { tag: "int", value: 1 } };
            }
            case "path":
                return todo();
            case "bool": {
                const ty = this.ch.patTy(pat);
                if (ty.kind.tag !== "bool") {
                    throw new Error();
                }
                const discrLocal = this.local(ty);
                this.addStmt({
                    tag: "assign",
                    place: { local: discrLocal, proj: [] },
                    rval: discr,
                });
                const local = this.local(ty);
                this.addStmt({
                    tag: "assign",
                    place: { local, proj: [] },
                    rval: {
                        tag: "binary",
                        binaryType: "eq",
                        left: this.copyOrMoveLocal(discrLocal, ty),
                        right: { tag: "const", val: { tag: "int", value: 1 } },
                    },
                });
                return this.copyOrMoveLocal(local, ty);
            }
            case "tuple": {
                const ty = this.ch.patTy(pat);
                if (ty.kind.tag === "struct") {
                    const discrLocal = this.local(ty);
                    this.addStmt({
                        tag: "assign",
                        place: { local: discrLocal, proj: [] },
                        rval: discr,
                    });
                    const condLocals: LocalId[] = [];
                    for (const [fieldIdx, pat] of k.elems.entries()) {
                        if (ty.kind.data.tag !== "tuple") {
                            throw new Error();
                        }
                        const elemTy = ty.kind.data.elems[fieldIdx].ty;
                        const condOperand = this.lowerMatchArmPatternCondition({
                            tag: "use",
                            operand: {
                                tag: "move",
                                place: {
                                    local: discrLocal,
                                    proj: [{ tag: "field", fieldIdx }],
                                },
                            },
                        }, pat);
                        const condLocal = this.local(Ty({ tag: "int" }));
                        this.addStmt({
                            tag: "assign",
                            place: { local: condLocal, proj: [] },
                            rval: { tag: "use", operand: condOperand },
                        });
                        condLocals.push(condLocal);
                    }
                    const condRVal = condLocals
                        .reduce((condRVal, condLocal) => {
                            const local = this.local(Ty({ tag: "int" }));
                        });
                }
                return todo();
            }
            case "struct":
                return todo();
        }
        exhausted(k);
    }

    private lowerMatchArmPatternBindings(
        discr: RVal,
        pat: ast.Pat,
    ) {
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return;
            case "bind": {
                const ty = this.ch.patTy(pat);
                const local = this.local(ty);
                this.addStmt({
                    tag: "assign",
                    place: { local, proj: [] },
                    rval: discr,
                });
                return;
            }
            case "path":
                return;
            case "bool":
                return;
            case "tuple":
                return todo();
            case "struct":
                return todo();
        }
        exhausted(k);
    }

    private lowerLoopExpr(expr: ast.Expr, kind: ast.LoopExpr): RVal {
        const entryBlock = this.currentBlock!;
        const loopBlock = this.pushBlock();

        const endBlock = this.createBlock();

        const info = {
            loopBlock: loopBlock.id,
            endBlock: endBlock.id,
            resultLocal: undefined,
        };
        this.loopInfos.set(expr.id, info);

        const rval = this.lowerExpr(kind.body);
        // ignore value;
        void rval;

        this.setTer({ tag: "goto", target: loopBlock.id });
        this.setTer({ tag: "goto", target: loopBlock.id }, entryBlock);

        this.pushCreatedBlock(endBlock);

        if (info.resultLocal) {
            const ty = this.ch.exprTy(expr);
            return {
                tag: "use",
                operand: this.copyOrMoveLocal(info.resultLocal, ty),
            };
        } else {
            return {
                tag: "use",
                operand: { tag: "const", val: { tag: "null" } },
            };
        }
    }

    private lowerWhileExpr(expr: ast.Expr, kind: ast.WhileExpr): RVal {
        const enterBlock = this.currentBlock!;
        const condBlock = this.pushBlock();
        this.setTer({ tag: "goto", target: condBlock.id }, enterBlock);
        const condTy = this.ch.exprTy(kind.cond);
        const condLocal = this.localMut(condTy);
        const condVal = this.lowerExpr(kind.cond);
        this.addStmt({
            tag: "assign",
            place: { local: condLocal, proj: [] },
            rval: condVal,
        });

        if (this.ch.exprTy(expr).kind.tag !== "null") {
            throw new Error();
        }
        const bodyBlock = this.pushBlock();
        const exitBlock = this.createBlock();

        this.loopInfos.set(expr.id, {
            loopBlock: condBlock.id,
            endBlock: exitBlock.id,
        });

        this.lowerExpr(kind.body);
        this.setTer({ tag: "goto", target: condBlock.id });

        this.pushCreatedBlock(exitBlock);

        this.setTer({
            tag: "switch",
            discr: this.copyOrMoveLocal(condLocal, condTy),
            targets: [{ value: 1, target: bodyBlock.id }],
            otherwise: exitBlock.id,
        }, condBlock);
        return {
            tag: "use",
            operand: { tag: "const", val: { tag: "null" } },
        };
    }

    private lowerCForExpr(expr: ast.Expr, kind: ast.CForExpr): RVal {
        kind.decl && this.lowerStmt(kind.decl);
        const enterBlock = this.currentBlock!;

        if (this.ch.exprTy(expr).kind.tag !== "null") {
            throw new Error();
        }

        let loopBlock: Block;
        const exitBlock = this.createBlock();

        if (kind.cond) {
            const condBlock = this.pushBlock();
            this.setTer({ tag: "goto", target: condBlock.id }, enterBlock);
            const condTy = this.ch.exprTy(kind.cond);
            const condLocal = this.localMut(condTy);
            const condVal = this.lowerExpr(kind.cond);
            this.addStmt({
                tag: "assign",
                place: { local: condLocal, proj: [] },
                rval: condVal,
            });

            const bodyBlock = this.pushBlock();

            this.setTer({
                tag: "switch",
                discr: this.copyOrMoveLocal(condLocal, condTy),
                targets: [{ value: 1, target: bodyBlock.id }],
                otherwise: exitBlock.id,
            }, condBlock);

            loopBlock = condBlock;

            this.loopInfos.set(expr.id, {
                loopBlock: condBlock.id,
                endBlock: exitBlock.id,
            });
        } else {
            loopBlock = this.pushBlock();

            this.setTer({ tag: "goto", target: loopBlock.id }, loopBlock);

            this.loopInfos.set(expr.id, {
                loopBlock: loopBlock.id,
                endBlock: exitBlock.id,
            });
        }

        this.lowerExpr(kind.body);
        if (kind.incr) {
            this.lowerStmt(kind.incr);
        }

        this.setTer({ tag: "goto", target: loopBlock.id });

        this.pushCreatedBlock(exitBlock);
        return {
            tag: "use",
            operand: { tag: "const", val: { tag: "null" } },
        };
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
            case "match":
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
                return this.copyOrMoveLocal(local, ty);
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
            case "enum":
                return todo();
            case "struct": {
                const data = re.kind.kind.data;
                switch (data.kind.tag) {
                    case "error":
                        return { tag: "error" };
                    case "struct":
                    case "unit":
                    case "tuple":
                        return todo(data.kind.tag);
                }
                return exhausted(data.kind);
            }
            case "variant": {
                const data = re.kind.variant.data;
                switch (data.kind.tag) {
                    case "error":
                        return { tag: "error" };
                    case "struct":
                    case "unit":
                    case "tuple":
                        return todo(data.kind.tag);
                }
                return exhausted(data.kind);
            }
            case "field":
                return todo();
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
                return this.copyOrMoveLocal(local, ty);
            }
            case "fn": {
                const { item, kind } = re.kind;
                return { tag: "const", val: { tag: "fn", item, kind } };
            }
        }
        exhausted(re.kind);
    }

    private copyOrMoveLocal(local: LocalId, ty: Ty): Operand {
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
                case "enum":
                case "struct":
                    return false;
            }
            exhausted(ty.kind);
        })();
        return {
            tag: isCopyable ? "copy" : "move",
            place: { local, proj: [] },
        };
    }

    private local(ty: Ty, ident?: ast.Ident): LocalId {
        const id = this.localIds.nextThenStep();
        this.locals.set(id, { id, ty, mut: false, ident });
        return id;
    }

    private localMut(ty: Ty, ident?: ast.Ident): LocalId {
        const id = this.localIds.nextThenStep();
        this.locals.set(id, { id, ty, mut: true, ident });
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

    private createBlock(): Block {
        const id = this.blockIds.nextThenStep();
        const block: Block = {
            id,
            stmts: [],
            terminator: { kind: { tag: "unset" } },
        };
        return block;
    }

    private pushCreatedBlock(block: Block) {
        this.blocks.set(block.id, block);
        this.currentBlock = block;
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
