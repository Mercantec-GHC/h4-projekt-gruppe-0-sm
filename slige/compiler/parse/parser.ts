import {
    AnonFieldDef,
    AssignType,
    BinaryType,
    Block,
    Cx,
    Expr,
    ExprField,
    ExprKind,
    File,
    GenericParam,
    Ident,
    Item,
    ItemKind,
    Param,
    Pat,
    Path,
    PathSegment,
    PatKind,
    RefType,
    Stmt,
    StmtKind,
    Ty,
    TyKind,
    UnaryType,
} from "@slige/ast";
import { Ctx, File as CtxFile, Res, Span } from "@slige/common";
import { Lexer } from "./lexer.ts";
import { TokenIter } from "./token.ts";
import { SigFilter } from "./token.ts";
import { Token } from "./token.ts";

type ParseRes<V, E = undefined> = Res<V, E>;

type StmtDetails = {
    pub: boolean;
    annos: { ident: Ident; args: Expr[]; pos: Span }[];
};

export class Parser {
    private lexer: TokenIter;
    private currentToken: Token | null;

    public constructor(
        private ctx: Ctx,
        private cx: Cx,
        private file: CtxFile,
    ) {
        this.lexer = new SigFilter(new Lexer(this.ctx, this.file));
        this.currentToken = this.lexer.next();
    }

    public parse(): File {
        return { stmts: this.parseStmts(), file: this.file };
    }

    private parseStmts(): Stmt[] {
        const stmts: Stmt[] = [];
        while (!this.done()) {
            stmts.push(this.parseStmt());
        }
        return stmts;
    }

    private parseStmt(): Stmt {
        if (
            ["#", "pub", "mod", "fn"].some((tt) => this.test(tt))
        ) {
            return this.parseItemStmt();
        } else if (
            ["let", "type_alias", "return", "break"].some((tt) => this.test(tt))
        ) {
            const expr = this.parseSingleLineBlockStmt();
            this.eatSemicolon();
            return expr;
        } else if (
            ["{", "if", "loop", "while", "for"].some((tt) => this.test(tt))
        ) {
            const expr = this.parseMultiLineBlockExpr();
            return (this.stmt({ tag: "expr", expr }, expr.span));
        } else {
            const expr = this.parseAssign();
            this.eatSemicolon();
            return expr;
        }
    }

    private parseMultiLineBlockExpr(): Expr {
        const begin = this.span();
        if (this.test("{")) {
            return this.parseBlockExpr();
        }
        if (this.test("if")) {
            return this.parseIf();
        }
        if (this.test("loop")) {
            return this.parseLoop();
        }
        if (this.test("while")) {
            return this.parseWhile();
        }
        if (this.test("for")) {
            return this.parseFor();
        }
        this.report("expected expr");
        return this.expr({ tag: "error" }, begin);
    }

    private parseSingleLineBlockStmt(): Stmt {
        const begin = this.span();
        if (this.test("let")) {
            return this.parseLet();
        }
        if (this.test("type_alias")) {
            return this.parseTypeAlias();
        }
        if (this.test("return")) {
            return this.parseReturn();
        }
        if (this.test("break")) {
            return this.parseBreak();
        }
        this.report("expected stmt");
        return this.stmt({ tag: "error" }, begin);
    }

    private eatSemicolon() {
        if (!this.test(";")) {
            this.report(
                `expected ';', got '${this.currentToken?.type ?? "eof"}'`,
            );
            return;
        }
        this.step();
    }

    private parseExpr(rs: ExprRestricts = 0): Expr {
        return this.parseBinary(rs);
    }

    private parseBlock(): ParseRes<Block, undefined> {
        const begin = this.span();
        this.step();
        const stmts: Stmt[] = [];
        while (!this.done()) {
            if (this.test("}")) {
                const span = Span.fromto(begin, this.span());
                this.step();
                return Res.Ok({ stmts, span });
            } else if (
                ["#", "pub", "mod", "fn"].some((tt) => this.test(tt))
            ) {
                stmts.push(this.parseItemStmt());
            } else if (
                ["let", "type_alias", "return", "break"]
                    .some((tt) => this.test(tt))
            ) {
                stmts.push(this.parseSingleLineBlockStmt());
                this.eatSemicolon();
            } else if (
                ["{", "if", "loop", "while", "for"].some((tt) => this.test(tt))
            ) {
                const expr = this.parseMultiLineBlockExpr();
                const span = expr.span;
                if (this.test("}")) {
                    this.step();
                    return Res.Ok({ stmts, expr, span });
                }
                stmts.push(this.stmt({ tag: "expr", expr }, span));
            } else {
                const expr = this.parseExpr();
                if (this.test("=") || this.test("+=") || this.test("-=")) {
                    const assignType = this.current().type as AssignType;
                    this.step();
                    const value = this.parseExpr();
                    this.eatSemicolon();
                    stmts.push(
                        this.stmt(
                            {
                                tag: "assign",
                                assignType,
                                subject: expr,
                                value,
                            },
                            Span.fromto(expr.span, value.span),
                        ),
                    );
                } else if (this.test(";")) {
                    this.step();
                    stmts.push(this.stmt({ tag: "expr", expr }, expr.span));
                } else if (this.test("}")) {
                    this.step();
                    return Res.Ok({ stmts, expr, span: expr.span });
                } else {
                    this.report("expected ';' or '}'");
                    return Res.Err(undefined);
                }
            }
        }
        this.report("expected '}'");
        return Res.Err(undefined);
    }

    private parseBlockExpr(): Expr {
        const block = this.parseBlock();
        return block.ok
            ? this.expr({ tag: "block", block: block.val }, this.span())
            : this.expr({ tag: "error" }, this.span());
    }

    private parseItemStmt(
        pos = this.span(),
        details: StmtDetails = {
            pub: false,
            annos: [],
        },
    ): Stmt {
        const sbegin = this.span();
        if (this.test("#") && !details.pub) {
            this.step();
            if (!this.test("[")) {
                this.report("expected '['");
                return this.stmt({ tag: "error" }, sbegin);
            }
            this.step();
            if (!this.test("ident")) {
                this.report("expected 'ident'");
                return this.stmt({ tag: "error" }, sbegin);
            }
            const ident = this.parseIdent();
            const args: Expr[] = [];
            if (this.test("(")) {
                this.step();
                if (!this.done() && !this.test(")")) {
                    args.push(this.parseExpr());
                    while (this.test(",")) {
                        this.step();
                        if (this.done() || this.test(")")) {
                            break;
                        }
                        args.push(this.parseExpr());
                    }
                }
                if (!this.test(")")) {
                    this.report("expected ')'");
                    return this.stmt({ tag: "error" }, sbegin);
                }
                this.step();
            }
            if (!this.test("]")) {
                this.report("expected ']'");
                return this.stmt({ tag: "error" }, sbegin);
            }
            this.step();
            const anno = { ident, args, pos: sbegin };
            return this.parseItemStmt(pos, {
                ...details,
                annos: [...details.annos, anno],
            });
        } else if (this.test("pub") && !details.pub) {
            this.step();
            return this.parseItemStmt(pos, { ...details, pub: true });
        } else if (this.test("mod")) {
            return this.parseMod(details);
        } else if (this.test("fn")) {
            return this.parseFn(details);
        } else {
            this.report("expected item statement");
            return this.stmt({ tag: "error" }, pos);
        }
    }

    private parseMod(details: StmtDetails): Stmt {
        const pos = this.span();
        this.step();
        if (!this.test("ident")) {
            this.report("expected 'ident'");
            return this.stmt({ tag: "error" }, pos);
        }
        const ident = this.parseIdent();
        if (this.test("str")) {
            const filePath = this.current().stringValue!;
            this.step();
            this.eatSemicolon();
            return this.stmt({
                tag: "item",
                item: this.item(
                    { tag: "mod_file", filePath },
                    pos,
                    ident,
                    details.pub,
                ),
            }, pos);
        }

        if (!this.test("{")) {
            this.report("expected '{' or 'string'");
            return this.stmt({ tag: "error" }, pos);
        }
        this.step();

        const stmts: Stmt[] = [];
        while (!this.done() && !this.test("}")) {
            stmts.push(this.parseStmt());
        }

        if (!this.test("}")) {
            this.report("expected '}'");
            return this.stmt({ tag: "error" }, pos);
        }
        this.step();

        return this.stmt({
            tag: "item",
            item: this.item(
                {
                    tag: "mod_block",
                    block: {
                        stmts,
                        span: Span.fromto(pos, stmts.at(-1)?.span ?? pos),
                    },
                },
                pos,
                ident,
                details.pub,
            ),
        }, pos);
    }

    private parseFn(details: StmtDetails): Stmt {
        const pos = this.span();
        this.step();
        if (!this.test("ident")) {
            this.report("expected ident");
            return this.stmt({ tag: "error" }, pos);
        }
        const ident = this.parseIdent();
        let genericParams: GenericParam[] | undefined;
        if (this.test("<")) {
            genericParams = this.parseFnTyParams();
        }
        if (!this.test("(")) {
            this.report("expected '('");
            return this.stmt({ tag: "error" }, pos);
        }
        const params = this.parseFnParams();
        let returnTy: Ty | undefined;
        if (this.test("->")) {
            this.step();
            returnTy = this.parseTy();
        }

        if (!this.test("{")) {
            this.report("expected block");
            return this.stmt({ tag: "error" }, pos);
        }
        const blockRes = this.parseBlock();
        if (!blockRes.ok) {
            return this.stmt({ tag: "error" }, this.span());
        }
        const body = blockRes.val;
        return this.stmt({
            tag: "item",
            item: this.item(
                {
                    tag: "fn",
                    params,
                    returnTy,
                    body,
                    ...(genericParams
                        ? { generics: { params: genericParams } }
                        : {}),
                },
                pos,
                ident,
                details.pub,
            ),
        }, pos);
    }

    private parseFnTyParams(): GenericParam[] {
        return this.parseDelimitedList(this.parseTyParam, ">", ",");
    }

    private parseTyParam(_index: number): ParseRes<GenericParam> {
        const span = this.span();
        if (this.test("ident")) {
            const ident = this.parseIdent();
            return Res.Ok({ ident, span });
        }
        this.report("expected generic parameter");
        return Res.Err(undefined);
    }

    private parseFnParams(): Param[] {
        return this.parseDelimitedList(this.parseParam, ")", ",");
    }

    private parseDelimitedList<T>(
        parseElem: (this: Parser, index: number) => ParseRes<T>,
        endToken: string,
        delimiter: string,
    ): T[] {
        this.step();
        if (this.test(endToken)) {
            this.step();
            return [];
        }
        let i = 0;
        const elems: T[] = [];
        const elemRes = parseElem.call(this, i);
        if (!elemRes.ok) {
            return [];
        }
        elems.push(elemRes.val);
        i += 1;
        while (this.test(delimiter)) {
            this.step();
            if (this.test(endToken)) {
                break;
            }
            const elemRes = parseElem.call(this, i);
            if (!elemRes.ok) {
                return [];
            }
            elems.push(elemRes.val);
            i += 1;
        }
        if (!this.test(endToken)) {
            this.report(`expected '${endToken}'`);
            return elems;
        }
        this.step();
        return elems;
    }

    private parseParam(): ParseRes<Param> {
        const begin = this.span();
        const pat = this.parsePat();
        if (!this.test(":")) {
            this.report("expected ':'");
            return Res.Err(undefined);
        }
        this.step();
        const ty = this.parseTy();
        return Res.Ok({
            pat,
            ty,
            span: Span.fromto(begin, ty.span),
        });
    }

    private parseLet(): Stmt {
        const pos = this.span();
        this.step();
        const pat = this.parsePat();
        let ty: Ty | undefined = undefined;
        if (this.test(":")) {
            this.step();
            ty = this.parseTy();
        }
        if (!this.test("=")) {
            this.report("expected '='");
            return this.stmt({ tag: "error" }, pos);
        }
        this.step();
        const expr = this.parseExpr();
        return this.stmt({ tag: "let", pat, ty, expr }, pos);
    }

    private parseTypeAlias(): Stmt {
        const begin = this.span();
        this.step();
        if (!this.test("ident")) {
            this.report("expected ident");
            return this.stmt({ tag: "error" }, begin);
        }
        const ident = this.parseIdent();
        if (!this.test("=")) {
            this.report("expected '='");
            return this.stmt({ tag: "error" }, begin);
        }
        this.step();
        const ty = this.parseTy();
        return this.stmt({
            tag: "item",
            item: this.item(
                {
                    tag: "type_alias",
                    ty,
                },
                Span.fromto(begin, ty.span),
                ident,
                false,
            ),
        }, begin);
    }

    private parseAssign(): Stmt {
        const pos = this.span();
        const subject = this.parseExpr();
        if (this.test("=") || this.test("+=") || this.test("-=")) {
            const assignType = this.current().type as AssignType;
            this.step();
            const value = this.parseExpr();
            return this.stmt({
                tag: "assign",
                assignType,
                subject,
                value,
            }, pos);
        }
        return this.stmt({ tag: "expr", expr: subject }, pos);
    }

    private parseReturn(): Stmt {
        const pos = this.span();
        this.step();
        if (this.test(";")) {
            return this.stmt({ tag: "return" }, pos);
        }
        const expr = this.parseExpr();
        return this.stmt({ tag: "return", expr }, pos);
    }

    private parseBreak(): Stmt {
        const pos = this.span();
        this.step();
        if (this.test(";")) {
            return this.stmt({ tag: "break" }, pos);
        }
        const expr = this.parseExpr();
        return this.stmt({ tag: "break", expr }, pos);
    }

    private parseLoop(): Expr {
        const pos = this.span();
        this.step();
        if (!this.test("{")) {
            this.report("expected '{'");
            return this.expr({ tag: "error" }, pos);
        }
        const body = this.parseExpr();
        return this.expr({ tag: "loop", body }, pos);
    }

    private parseWhile(): Expr {
        const pos = this.span();
        this.step();
        const cond = this.parseExpr();
        if (!this.test("{")) {
            this.report("expected '{'");
            return this.expr({ tag: "error" }, pos);
        }
        const body = this.parseExpr();
        return this.expr({ tag: "while", cond, body }, pos);
    }

    private parseFor(): Expr {
        const pos = this.span();
        this.step();

        if (this.test("(")) {
            return this.parseForClassicTail(pos);
        }

        const pat = this.parsePat();

        if (!this.test("in")) {
            this.report("expected 'in'");
            return this.expr({ tag: "error" }, pos);
        }
        this.step();
        const expr = this.parseExpr();

        if (!this.test("{")) {
            this.report("expected '{'");
            return this.expr({ tag: "error" }, pos);
        }
        const body = this.parseExpr();
        return this.expr({ tag: "for", pat, expr, body }, pos);
    }

    private parseForClassicTail(begin: Span): Expr {
        this.step();
        let decl: Stmt | undefined;
        if (!this.test(";")) {
            decl = this.parseLet();
        }
        if (!this.test(";")) {
            this.report("expected ';'");
            return this.expr({ tag: "error" }, begin);
        }
        this.step();
        let cond: Expr | undefined;
        if (!this.test(";")) {
            cond = this.parseExpr();
        }
        if (!this.test(";")) {
            this.report("expected ';'");
            return this.expr({ tag: "error" }, begin);
        }
        this.step();
        let incr: Stmt | undefined;
        if (!this.test(")")) {
            incr = this.parseAssign();
        }
        if (!this.test(")")) {
            this.report("expected '}'");
            return this.expr({ tag: "error" }, begin);
        }
        this.step();

        if (!this.test("{")) {
            this.report("expected '{'");
            return this.expr({ tag: "error" }, begin);
        }
        const body = this.parseExpr();
        return this.expr(
            { tag: "c_for", decl, cond, incr, body },
            Span.fromto(begin, body.span),
        );
    }

    private parseArray(): Expr {
        const pos = this.span();
        this.step();
        const exprs: Expr[] = [];
        if (!this.test("]")) {
            exprs.push(this.parseExpr());
            while (this.test(",")) {
                this.step();
                if (this.done() || this.test("]")) {
                    break;
                }
                exprs.push(this.parseExpr());
            }
        }
        if (!this.test("]")) {
            this.report("expected ']'");
            return this.expr({ tag: "error" }, pos);
        }
        this.step();
        return this.expr({ tag: "array", exprs }, pos);
    }

    private parseStruct(): Expr {
        const pos = this.span();
        this.step();
        if (!this.test("{")) {
            this.report("expected '{'");
            return this.expr({ tag: "error" }, pos);
        }
        this.step();
        const fields: ExprField[] = [];
        if (!this.test("}")) {
            const res = this.parseStructField();
            if (!res.ok) {
                return this.expr({ tag: "error" }, this.span());
            }
            fields.push(res.val);
            while (this.test(",")) {
                this.step();
                if (this.done() || this.test("}")) {
                    break;
                }
                const res = this.parseStructField();
                if (!res.ok) {
                    return this.expr({ tag: "error" }, this.span());
                }
                fields.push(res.val);
            }
        }
        if (!this.test("}")) {
            this.report("expected '}'");
            return this.expr({ tag: "error" }, pos);
        }
        this.step();
        return this.expr({ tag: "struct", fields }, pos);
    }

    private parseStructField(): ParseRes<ExprField> {
        const span = this.span();
        if (!this.test("ident")) {
            this.report("expected 'ident'");
            return Res.Err(undefined);
        }
        const ident = this.parseIdent();
        if (!this.test(":")) {
            this.report("expected ':'");
            return Res.Err(undefined);
        }
        this.step();
        const expr = this.parseExpr();
        return Res.Ok({ ident, expr, span });
    }

    private parseIf(): Expr {
        const pos = this.span();
        this.step();
        const cond = this.parseExpr(ExprRestricts.NoStructs);
        if (!this.test("{")) {
            this.report("expected block");
            return this.expr({ tag: "error" }, pos);
        }
        const truthy = this.parseBlockExpr();
        if (!this.test("else")) {
            return this.expr({ tag: "if", cond, truthy }, pos);
        }
        //const elsePos = this.span();
        this.step();
        if (this.test("if")) {
            const falsy = this.parseIf();
            return this.expr({ tag: "if", cond, truthy, falsy }, pos);
        }
        if (!this.test("{")) {
            this.report("expected block");
            return this.expr({ tag: "error" }, pos);
        }
        const falsy = this.parseBlockExpr();
        return this.expr({ tag: "if", cond, truthy, falsy }, pos);
    }

    private parseBinary(rs: ExprRestricts): Expr {
        return this.parseOr(rs);
    }

    private parseOr(rs: ExprRestricts): Expr {
        let left = this.parseAnd(rs);
        while (true) {
            if (this.test("or")) {
                left = this.parBinTail(left, rs, this.parseAnd, "or");
            } else {
                break;
            }
        }
        return left;
    }

    private parseAnd(rs: ExprRestricts): Expr {
        let left = this.parseEquality(rs);
        while (true) {
            if (this.test("and")) {
                left = this.parBinTail(left, rs, this.parseEquality, "and");
            } else {
                break;
            }
        }
        return left;
    }

    private parseEquality(rs: ExprRestricts): Expr {
        const left = this.parseComparison(rs);
        if (this.test("==") || this.test("!=")) {
            const op = this.current().type as BinaryType;
            return this.parBinTail(left, rs, this.parseComparison, op);
        }
        return left;
    }

    private parseComparison(rs: ExprRestricts): Expr {
        const left = this.parseAddSub(rs);
        if (
            this.test("<") || this.test(">") || this.test("<=") ||
            this.test(">=")
        ) {
            const op = this.current().type as BinaryType;
            return this.parBinTail(left, rs, this.parseAddSub, op);
        }
        return left;
    }

    private parseAddSub(rs: ExprRestricts): Expr {
        let left = this.parseMulDiv(rs);
        while (true) {
            if (this.test("+") || this.test("-")) {
                const op = this.current().type as BinaryType;
                left = this.parBinTail(left, rs, this.parseMulDiv, op);
                continue;
            }
            break;
        }
        return left;
    }

    private parseMulDiv(rs: ExprRestricts): Expr {
        let left = this.parsePrefix(rs);
        while (true) {
            if (this.test("*") || this.test("/")) {
                const op = this.current().type as BinaryType;
                left = this.parBinTail(left, rs, this.parsePrefix, op);
                continue;
            }
            break;
        }
        return left;
    }

    private parBinTail(
        left: Expr,
        rs: ExprRestricts,
        parseRight: (this: Parser, rs: ExprRestricts) => Expr,
        binaryType: BinaryType,
    ): Expr {
        this.step();
        const right = parseRight.call(this, rs);
        return this.expr(
            { tag: "binary", binaryType, left, right },
            Span.fromto(left.span, right.span),
        );
    }

    private parsePrefix(rs: ExprRestricts): Expr {
        const pos = this.span();
        if (this.test("not") || this.test("-")) {
            const unaryType = this.current().type as UnaryType;
            this.step();
            const expr = this.parsePrefix(rs);
            return this.expr({ tag: "unary", unaryType, expr }, pos);
        }
        if (this.test("&")) {
            this.step();
            let refType: RefType = "ref";
            if (this.test("ptr")) {
                this.step();
                refType = "ptr";
            }
            let mut = false;
            if (this.test("mut")) {
                this.step();
                mut = true;
            }
            const expr = this.parsePrefix(rs);
            return this.expr({ tag: "ref", expr, mut, refType }, pos);
        }
        if (this.test("*")) {
            this.step();
            const expr = this.parsePrefix(rs);
            return this.expr({ tag: "deref", expr }, pos);
        }
        return this.parsePostfix(rs);
    }

    private parsePostfix(rs: ExprRestricts): Expr {
        let subject = this.parseOperand(rs);
        while (true) {
            if (this.test(".")) {
                subject = this.parseFieldTail(subject);
                continue;
            }
            if (this.test("[")) {
                subject = this.parseIndexTail(subject);
                continue;
            }
            if (this.test("(")) {
                subject = this.parseCallTail(subject);
                continue;
            }
            break;
        }
        return subject;
    }

    private parseFieldTail(expr: Expr): Expr {
        const pos = this.span();
        this.step();
        if (!this.test("ident")) {
            this.report("expected ident");
            return this.expr({ tag: "error" }, pos);
        }
        const ident = this.parseIdent();
        return this.expr({ tag: "field", expr, ident }, pos);
    }

    private parseIndexTail(expr: Expr): Expr {
        const pos = this.span();
        this.step();
        const index = this.parseExpr();
        if (!this.test("]")) {
            this.report("expected ']'");
            return this.expr({ tag: "error" }, pos);
        }
        this.step();
        return this.expr({ tag: "index", expr, index }, pos);
    }

    private parseCallTail(expr: Expr): Expr {
        const pos = this.span();
        const args = this.parseDelimitedList(
            this.parseExprArg,
            ")",
            ",",
        );
        return this.expr({ tag: "call", expr, args }, pos);
    }

    private parseExprArg(): ParseRes<Expr> {
        return Res.Ok(this.parseExpr());
    }

    private parseOperand(rs: ExprRestricts): Expr {
        const pos = this.span();
        if (this.test("ident")) {
            const pathRes = this.parsePath();
            if (!pathRes.ok) {
                return this.expr({ tag: "error" }, pos);
            }
            if (this.test("{") && !(rs & ExprRestricts.NoStructs)) {
                this.step();
                const fields = this.parseDelimitedList(
                    this.parseExprField,
                    "}",
                    ",",
                );
                return this.expr(
                    { tag: "struct", path: pathRes.val, fields },
                    pathRes.val.span,
                );
            }
            return this.expr({ tag: "path", path: pathRes.val }, pos);
        }
        if (this.test("int")) {
            const value = this.current().intValue!;
            this.step();
            return this.expr({ tag: "int", value }, pos);
        }
        if (this.test("str")) {
            const value = this.current().stringValue!;
            this.step();
            return this.expr({ tag: "str", value }, pos);
        }
        if (this.test("false")) {
            this.step();
            return this.expr({ tag: "bool", value: false }, pos);
        }
        if (this.test("true")) {
            this.step();
            return this.expr({ tag: "bool", value: true }, pos);
        }
        if (this.test("null")) {
            this.step();
            return this.expr({ tag: "null" }, pos);
        }
        if (this.test("(")) {
            this.step();
            const expr = this.parseExpr();
            if (!this.test(")")) {
                this.report("expected ')'");
                return this.expr({ tag: "error" }, pos);
            }
            this.step();
            return this.expr({ tag: "group", expr }, pos);
        }
        if (this.test("[")) {
            return this.parseArray();
        }
        if (this.test("struct")) {
            return this.parseStruct();
        }
        if (this.test("{")) {
            return this.parseBlockExpr();
        }
        if (this.test("if")) {
            return this.parseIf();
        }
        if (this.test("loop")) {
            return this.parseLoop();
        }

        this.report(`expected expr, got '${this.current().type}'`, pos);
        this.step();
        return this.expr({ tag: "error" }, pos);
    }

    private parseExprField(): ParseRes<ExprField> {
        if (!this.test("ident")) {
            this.report("expected 'ident'");
            return Res.Err(undefined);
        }
        const ident = this.parseIdent();
        if (!this.test(":")) {
            this.report("expected ':'");
            return Res.Err(undefined);
        }
        this.step();
        const expr = this.parseExpr();
        return Res.Ok({
            ident,
            expr,
            span: Span.fromto(ident.span, expr.span),
        });
    }

    private parsePat(): Pat {
        const pos = this.span();
        if (this.test("ident")) {
            const ident = this.parseIdent();
            return this.pat({ tag: "bind", ident, mut: false }, ident.span);
        }
        if (this.test("mut")) {
            this.step();
            if (!this.test("ident")) {
                this.report("expected 'ident'");
                return this.pat({ tag: "error" }, pos);
            }
            const ident = this.parseIdent();
            return this.pat({ tag: "bind", ident, mut: false }, pos);
        }
        this.report(`expected pattern, got '${this.current().type}'`, pos);
        this.step();
        return this.pat({ tag: "error" }, pos);
    }

    private parseTy(): Ty {
        const pos = this.span();
        if (["null", "int", "bool", "str"].includes(this.current().type)) {
            const tag = this.current().type as
                | "null"
                | "int"
                | "bool"
                | "str";
            this.step();
            return this.ty({ tag }, pos);
        }
        if (this.test("ident")) {
            const pathRes = this.parsePath();
            if (!pathRes.ok) {
                return this.ty({ tag: "error" }, pos);
            }
            return this.ty({ tag: "path", path: pathRes.val }, pos);
        }
        if (this.test("[")) {
            this.step();
            const ty = this.parseTy();
            if (this.test(";")) {
                this.step();
                const length = this.parseExpr();
                if (!this.test("]")) {
                    this.report("expected ']'", pos);
                    return this.ty({ tag: "error" }, pos);
                }
                this.step();
                return this.ty({ tag: "array", ty, length }, pos);
            }
            if (!this.test("]")) {
                this.report("expected ']' or ';'", pos);
                return this.ty({ tag: "error" }, pos);
            }
            this.step();
            return this.ty({ tag: "slice", ty }, pos);
        }
        if (this.test("struct")) {
            this.step();
            if (!this.test("{")) {
                this.report("expected '{'");
                return this.ty({ tag: "error" }, pos);
            }
            const fields = this.parseAnonFieldDefs();
            return this.ty({ tag: "anon_struct", fields }, pos);
        }
        if (this.test("&")) {
            this.step();
            let mut = false;
            if (this.test("mut")) {
                this.step();
                mut = true;
            }
            const ty = this.parseTy();
            return this.ty({ tag: "ref", ty, mut }, pos);
        }
        if (this.test("*")) {
            this.step();
            let mut = false;
            if (this.test("mut")) {
                this.step();
                mut = true;
            }
            const ty = this.parseTy();
            return this.ty({ tag: "ptr", ty, mut }, pos);
        }
        this.report("expected type");
        return this.ty({ tag: "error" }, pos);
    }

    private parseAnonFieldDefs(): AnonFieldDef[] {
        this.step();
        if (this.test("}")) {
            this.step();
            return [];
        }
        const params: AnonFieldDef[] = [];
        const paramResult = this.parseAnonFieldDef();
        if (!paramResult.ok) {
            return [];
        }
        params.push(paramResult.val);
        while (this.test(",")) {
            this.step();
            if (this.test("}")) {
                break;
            }
            const paramResult = this.parseAnonFieldDef();
            if (!paramResult.ok) {
                return [];
            }
            params.push(paramResult.val);
        }
        if (!this.test("}")) {
            this.report("expected '}'");
            return params;
        }
        this.step();
        return params;
    }

    private parseAnonFieldDef(): ParseRes<AnonFieldDef> {
        const begin = this.span();
        const identRes = this.eatIdent();
        if (!identRes.ok) return Res.Err(undefined);
        const ident = identRes.val;
        if (!this.test(":")) {
            this.report("expected ':'");
            return Res.Err(undefined);
        }
        this.step();
        const ty = this.parseTy();
        return Res.Ok({
            ident,
            ty,
            span: Span.fromto(begin, ty.span),
        });
    }

    private parsePath(): ParseRes<Path> {
        const begin = this.span();
        let end = begin;
        const segments: PathSegment[] = [];
        const identRes = this.eatIdent();
        if (!identRes.ok) return Res.Err(undefined);
        const ident = identRes.val;
        segments.push({ ident, span: Span.fromto(begin, end) });
        while (this.test("::")) {
            this.step();
            if (!this.test("ident")) {
                this.report("expected 'ident'");
                return Res.Err(undefined);
            }
            end = this.span();
            const ident = this.parseIdent();
            let genericArgs: Ty[] | undefined = undefined;
            if (this.test("::")) {
                this.step();
                if (!this.test("<")) {
                    this.report("expected '<'");
                    return Res.Err(undefined);
                }
                genericArgs = this.parseDelimitedList(
                    this.parseTyRes,
                    ">",
                    ",",
                );
            }
            segments.push({
                ident,
                genericArgs,
                span: Span.fromto(begin, end),
            });
        }
        return Res.Ok({ segments, span: Span.fromto(begin, end) });
    }

    private parseTyRes(): ParseRes<Ty> {
        return Res.Ok(this.parseTy());
    }

    private eatIdent(): ParseRes<Ident> {
        if (!this.test("ident")) {
            this.report("expected 'ident'");
            return Res.Err(undefined);
        }
        return Res.Ok(this.parseIdent());
    }

    private parseIdent(): Ident {
        const tok = this.current();
        this.step();
        return { id: tok.identId!, text: tok.identText!, span: tok.span };
    }

    private step() {
        this.currentToken = this.lexer.next();
    }

    private done(): boolean {
        return this.currentToken == null;
    }

    private current(): Token {
        return this.currentToken!;
    }

    private lastSpan?: Span;
    private span(): Span {
        if (this.done()) {
            return this.lastSpan!;
        }
        return this.lastSpan = this.current().span;
    }

    private test(type: string): boolean {
        return !this.done() && this.current().type === type;
    }

    private report(msg: string, span = this.span()) {
        this.ctx.report({
            severity: "error",
            msg,
            file: this.file,
            span,
        });
    }

    private stmt(kind: StmtKind, span: Span): Stmt {
        return this.cx.stmt(kind, span);
    }

    private item(
        kind: ItemKind,
        span: Span,
        ident: Ident,
        pub: boolean,
    ): Item {
        return this.cx.item(kind, span, ident, pub);
    }

    private expr(kind: ExprKind, span: Span): Expr {
        return this.cx.expr(kind, span);
    }

    private pat(kind: PatKind, span: Span): Pat {
        return this.cx.pat(kind, span);
    }

    private ty(kind: TyKind, span: Span): Ty {
        return this.cx.ty(kind, span);
    }
}

const ExprRestricts = {
    NoStructs: 1 << 0,
} as const;

type ExprRestricts = (typeof ExprRestricts)[keyof typeof ExprRestricts];
