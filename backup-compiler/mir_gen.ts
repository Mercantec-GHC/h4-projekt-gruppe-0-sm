import { Checker, Resols } from "./front.ts";
import * as ast from "./ast.ts";
import { Block, Fn, Local, Stmt, StmtKind, Ter, TerKind, Val } from "./mir.ts";
import { Ty } from "./ty.ts";

export class MirGen {
    public constructor(
        private re: Resols,
        private ch: Checker,
    ) {}

    public fnMir(stmt: ast.Stmt, stmtKind: ast.FnStmt): Fn {
        return new FnMirGen(this.re, this.ch, stmt, stmtKind).generate();
    }
}

export class FnMirGen {
    private localIds = 0;
    private locals: Local[] = [];

    private paramLocals = new Map<number, Local>();
    private returnLocal!: Local;
    private letLocals = new Map<number, Local>();

    private blockIds = 0;
    private blocks: Block[] = [];

    private returnBlock!: Block;
    private currentBlock!: Block;
    private loopExitBlocks = new Map<number, Block>();

    public constructor(
        private re: Resols,
        private ch: Checker,
        private stmt: ast.Stmt,
        private stmtKind: ast.FnStmt,
    ) {}

    public generate(): Fn {
        const fnTy = this.ch.fnStmtTy(this.stmt);
        if (fnTy.tag !== "fn") {
            throw new Error();
        }

        this.returnLocal = this.local(fnTy.returnTy);
        for (const [i, param] of this.stmtKind.params.entries()) {
            const ty = this.ch.paramTy(this.stmt, i);
            const local = this.local(ty, param);
            this.paramLocals.set(i, local);
        }

        const entry = this.block();
        const exit = this.block();
        this.returnBlock = exit;

        this.currentBlock = entry;
        this.lowerBlock(this.stmtKind.body);

        this.currentBlock.ter = Ter({ tag: "goto", target: exit });
        exit.ter = Ter({ tag: "return" });
        return {
            stmt: this.stmt,
            locals: this.locals,
            paramLocals: this.paramLocals,
            returnLocal: this.returnLocal,
            blocks: this.blocks,
            entry: entry,
            exit: this.returnBlock,
        };
    }

    private lowerBlock(block: ast.Block) {
        for (const stmt of block.stmts) {
            this.lowerStmt(stmt);
        }
    }

    private lowerStmt(stmt: ast.Stmt) {
        const k = stmt.kind;
        switch (k.tag) {
            case "error":
                throw new Error();
            case "fn":
                throw new Error("cannot lower");
            case "let": {
                const ty = this.ch.letStmtTy(stmt);
                const local = this.local(ty);
                this.letLocals.set(stmt.id, local);
                if (k.expr) {
                    this.lowerExpr(k.expr);
                    this.pushStmt({ tag: "store", local });
                }
                return;
            }
            case "loop": {
                const entry = this.currentBlock;
                const exit = this.block();
                const loop = this.block();

                entry.ter = Ter({ tag: "goto", target: loop });

                this.loopExitBlocks.set(stmt.id, exit);

                this.currentBlock = loop;
                this.lowerBlock(k.body);
                this.currentBlock.ter = Ter({ tag: "goto", target: loop });

                this.currentBlock = exit;
                return;
            }
            case "if": {
                this.lowerExpr(k.expr);
                const entry = this.currentBlock;
                const exit = this.block();
                const truthy = this.block();

                this.currentBlock = truthy;
                this.lowerBlock(k.truthy);
                this.currentBlock.ter = Ter({ tag: "goto", target: exit });

                let falsy = exit;
                if (k.falsy) {
                    falsy = this.block();
                    this.currentBlock = falsy;
                    this.lowerBlock(k.falsy);
                    this.currentBlock.ter = Ter({ tag: "goto", target: exit });
                }

                entry.ter = Ter({ tag: "if", truthy, falsy });
                this.currentBlock = exit;
                return;
            }
            case "return": {
                if (k.expr) {
                    this.lowerExpr(k.expr);
                    this.pushStmt({
                        tag: "store",
                        local: this.returnLocal,
                    });
                }
                this.currentBlock.ter = Ter({
                    tag: "goto",
                    target: this.returnBlock,
                });
                this.currentBlock = this.block();
                return;
            }
            case "break": {
                const re = this.re.stmt(stmt)!;
                const target = this.loopExitBlocks.get(re!.stmt.id)!;
                this.currentBlock.ter = Ter({ tag: "goto", target });
                this.currentBlock = this.block();
                return;
            }
            case "assign": {
                const re = this.re.expr(k.subject)!;
                let local: Local;
                switch (re.tag) {
                    case "fn":
                        throw new Error("cannot assign to expression");
                    case "let":
                        local = this.letLocals.get(re.stmt.id)!;
                        break;
                    case "loop":
                        throw new Error("cannot assign to expression");
                    case "param":
                        local = this.paramLocals.get(re.i)!;
                        break;
                }
                this.lowerExpr(k.expr);
                this.pushStmt({ tag: "store", local });
                return;
            }
            case "expr": {
                const expr = this.lowerExpr(k.expr);
                void expr;
                this.pushStmt({ tag: "pop" });
                return;
            }
        }
        const _: never = k;
    }

    private lowerExpr(expr: ast.Expr) {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                throw new Error();
            case "ident": {
                const re = this.re.expr(expr);
                if (!re) {
                    throw new Error();
                }
                const ty = this.ch.exprTy(expr);
                switch (re.tag) {
                    case "fn": {
                        this.pushStmt({
                            tag: "push",
                            val: { tag: "fn", stmt: re.stmt },
                            ty,
                        });
                        return;
                    }
                    case "param": {
                        const local = this.paramLocals.get(re.i);
                        if (!local) {
                            throw new Error();
                        }
                        this.pushStmt({ tag: "load", local });
                        return;
                    }
                    case "let": {
                        const local = this.letLocals.get(re.stmt.id);
                        if (!local) {
                            throw new Error();
                        }
                        this.pushStmt({ tag: "load", local });
                        return;
                    }
                    case "loop":
                        throw new Error();
                }
                const __: never = re;
                return;
            }
            case "int": {
                const ty = this.ch.exprTy(expr);
                this.pushStmt({
                    tag: "push",
                    val: { tag: "int", val: k.val },
                    ty,
                });
                return;
            }
            case "string": {
                const ty = this.ch.exprTy(expr);
                this.pushStmt({
                    tag: "push",
                    val: { tag: "string", val: k.val },
                    ty,
                });
                return;
            }
            case "call": {
                for (const arg of k.args) {
                    this.lowerExpr(arg);
                }
                this.lowerExpr(k.expr);
                this.pushStmt({
                    tag: "call",
                    args: k.args.length,
                });
                return;
            }
            case "binary": {
                this.lowerExpr(k.left);
                this.lowerExpr(k.right);
                switch (k.op) {
                    case "<":
                        this.pushStmt({ tag: "lt" });
                        return;
                    case "==":
                        this.pushStmt({ tag: "eq" });
                        return;
                    case "+":
                        this.pushStmt({ tag: "add" });
                        return;
                    case "*":
                        this.pushStmt({ tag: "mul" });
                        return;
                }
                const __: never = k.op;
                return;
            }
        }
        const _: never = k;
    }

    private local(ty: Ty, ident?: string, stmt?: ast.Stmt): Local {
        const id = this.localIds++;
        const local: Local = { id, ty, ident, stmt };
        this.locals.push(local);
        return local;
    }

    private block(): Block {
        const id = this.blockIds++;
        const block: Block = { id, stmts: [], ter: Ter({ tag: "unset" }) };
        this.blocks.push(block);
        return block;
    }

    private pushStmt(kind: StmtKind) {
        this.currentBlock.stmts.push(Stmt(kind));
    }
}
