import { IdentId, Span } from "@slige/common";

export type Token = {
    type: string;
    span: Span;
    length: number;
    identId?: IdentId;
    identText?: string;
    intValue?: number;
    stringValue?: string;
};

export interface TokenIter {
    next(): Token | null;
}

export class SigFilter implements TokenIter {
    public constructor(private iter: TokenIter) {}

    next(): Token | null {
        const token = this.iter.next();
        if (token === null) {
            return token;
        }
        if (token?.type === "whitespace" || token?.type === "comment") {
            return this.next();
        }
        return token;
    }
}
