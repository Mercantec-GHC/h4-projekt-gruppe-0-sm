import { ControlFlow, Ctx, File, Pos, range, Span } from "@slige/common";
import { Token, TokenIter } from "./token.ts";

export class Lexer implements TokenIter {
    private idx = 0;
    private line = 1;
    private col = 1;

    private text: string;

    public constructor(
        private ctx: Ctx,
        private file: File,
    ) {
        this.text = ctx.fileInfo(file).text;
    }

    next(): Token | null {
        if (this.done()) {
            return null;
        }
        let cf: ControlFlow<Token>;
        if (
            cf = this.lexWithTail(
                (span) => this.token("whitespace", span),
                /[ \t\r\n]/,
            ), cf.break
        ) {
            return cf.val;
        }
        if (
            cf = this.lexWithTail(
                (span, val) => {
                    return keywords.has(val)
                        ? this.token(val, span)
                        : this.token("ident", span, {
                            type: "ident",
                            identId: this.ctx.internIdent(val),
                            identText: val,
                        });
                },
                /[a-zA-Z_]/,
                /[a-zA-Z0-9_]/,
            ), cf.break
        ) {
            return cf.val;
        }
        if (
            cf = this.lexWithTail(
                (span, val) =>
                    this.token("int", span, {
                        type: "int",
                        intValue: parseInt(val),
                    }),
                /[1-9]/,
                /[0-9]/,
            ), cf.break
        ) {
            return cf.val;
        }
        const begin = this.pos();
        let end = begin;
        const pos = begin;
        if (this.test("0")) {
            this.step();
            if (!this.done() && this.test(/[0-9]/)) {
                this.report("invalid number", pos);
                return this.token("error", { begin, end });
            }
            return this.token("int", { begin, end }, {
                type: "int",
                intValue: 0,
            });
        }

        if (this.test("'")) {
            this.step();
            let value: string;
            if (this.test("\\")) {
                this.step();
                if (this.done()) {
                    this.report("malformed character literal", pos);
                    return this.token("error", { begin, end });
                }
                value = {
                    n: "\n",
                    t: "\t",
                    "0": "\0",
                }[this.current()] ?? this.current();
            } else {
                value = this.current();
            }
            this.step();
            if (this.done() || !this.test("'") || value.length === 0) {
                this.report("malformed character literal", pos);
                return this.token("error", { begin, end });
            }
            this.step();
            return this.token("int", { begin, end }, {
                type: "int",
                intValue: value.charCodeAt(0),
            });
        }

        if (this.test('"')) {
            this.step();
            let value = "";
            while (!this.done() && !this.test('"')) {
                if (this.test("\\")) {
                    this.step();
                    if (this.done()) {
                        break;
                    }
                    value += {
                        n: "\n",
                        t: "\t",
                        "0": "\0",
                    }[this.current()] ?? this.current();
                } else {
                    value += this.current();
                }
                this.step();
            }
            if (this.done() || !this.test('"')) {
                this.report("unclosed/malformed string", pos);
                return this.token("error", { begin, end });
            }
            this.step();
            return this.token("str", { begin, end }, {
                type: "str",
                stringValue: value,
            });
        }

        if (this.test("/")) {
            this.step();

            if (this.test("/")) {
                while (!this.done() && !this.test("\n")) {
                    end = this.pos();
                    this.step();
                }
                return this.token("comment", { begin, end });
            }

            if (this.test("*")) {
                end = this.pos();
                this.step();
                let depth = 1;
                let last: string | undefined = undefined;
                while (!this.done() && depth > 0) {
                    if (last === "*" && this.current() === "/") {
                        depth -= 1;
                        last = undefined;
                    } else if (last === "/" && this.current() === "*") {
                        depth += 1;
                        last = undefined;
                    } else {
                        last = this.current();
                    }
                    end = this.pos();
                    this.step();
                }
                if (depth !== 0) {
                    this.report("unclosed/malformed multiline comment", pos);
                    return this.token("comment", { begin, end });
                }
            }

            return this.token("/", { begin, end });
        }

        const match = this.text.slice(this.idx).match(
            new RegExp(`^(${
                staticTokenRes
                    .map((tok) => tok.length > 1 ? `(?:${tok})` : tok)
                    .join("|")
            })`),
        );
        if (match) {
            for (const _ of range(match[1].length)) {
                end = this.pos();
                this.step();
            }
            return this.token(match[1], { begin, end });
        }

        this.report(`illegal character '${this.current()}'`, pos);
        this.step();
        return this.next();
    }

    private lexWithTail<R>(
        builder: (span: Span, val: string) => R,
        startPat: RegExp,
        tailPat = startPat,
    ): ControlFlow<R> {
        const begin = this.pos();
        if (!this.test(startPat)) {
            return ControlFlow.Continue(undefined);
        }
        let end = begin;
        let val = this.current();
        this.step();
        while (this.test(tailPat)) {
            end = begin;
            val += this.current();
            this.step();
        }
        return ControlFlow.Break(builder({ begin, end }, val));
    }

    private done(): boolean {
        return this.idx >= this.text.length;
    }

    private current(): string {
        return this.text[this.idx];
    }

    private step() {
        if (this.done()) {
            return;
        }
        if (this.current() === "\n") {
            this.line += 1;
            this.col = 1;
        } else {
            this.col += 1;
        }
        this.idx += 1;
    }

    private pos(): Pos {
        return {
            idx: this.idx,
            line: this.line,
            col: this.col,
        };
    }

    private token(type: string, span: Span, token?: Partial<Token>): Token {
        const length = span.end.idx - span.begin.idx + 1;
        return { type, span, length, ...token };
    }

    private test(pattern: RegExp | string): boolean {
        if (this.done()) {
            return false;
        }
        if (typeof pattern === "string") {
            return this.current() === pattern;
        } else if (pattern.source.startsWith("^")) {
            return pattern.test(this.text.slice(this.idx));
        } else {
            return pattern.test(this.current());
        }
    }

    private report(msg: string, pos: Pos) {
        this.ctx.report({
            severity: "error",
            origin: "parser",
            file: this.file,
            msg,
            pos,
        });
    }
}

const keywords = new Set([
    "false",
    "true",
    "null",
    "int",
    "bool",
    "str",
    "return",
    "break",
    "continue",
    "let",
    "mut",
    "fn",
    "loop",
    "if",
    "else",
    "struct",
    "enum",
    "or",
    "and",
    "not",
    "while",
    "for",
    "in",
    "mod",
    "pub",
    "use",
    "type_alias",
]);

const staticTokens = [
    "=",
    "==",
    "<",
    "<=",
    ">",
    ">=",
    "-",
    "->",
    "!",
    "!=",
    "+",
    "+=",
    "-=",
    ":",
    "::",
    "::<",
    "(",
    ")",
    "{",
    "}",
    "[",
    "]",
    "<",
    ">",
    ".",
    ",",
    ":",
    ";",
    "#",
    "&",
    "0",
] as const;

const staticTokenRes = staticTokens
    .toSorted((a, b) => b.length - a.length)
    .map((tok) => tok.split("").map((c) => `\\${c}`).join(""));
