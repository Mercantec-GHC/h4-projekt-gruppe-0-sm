import { Ctx, File } from "./ctx.ts";
import { exhausted } from "./util.ts";

export type Span = {
    begin: Pos;
    end: Pos;
};

export type Pos = {
    idx: number;
    line: number;
    col: number;
};

export const Span = {
    fromto: ({ begin }: Span, { end }: Span): Span => ({ begin, end }),
} as const;

export type Report = {
    severity: "fatal" | "error" | "warning" | "info";
    origin?: string;
    msg: string;
    file?: File;
    span?: Span;
    pos?: Pos;
};

export type ReportLocation =
    | { file: File; span: Span }
    | { file: File; pos: Pos };

function severityColor(severity: "fatal" | "error" | "warning" | "info") {
    switch (severity) {
        case "fatal":
            return "\x1b[1m\x1b[31m";
        case "error":
            return "\x1b[1m\x1b[31m";
        case "warning":
            return "\x1b[1m\x1b[33m";
        case "info":
            return "\x1b[1m\x1b[34m";
    }
    exhausted(severity);
}

export function prettyPrintReport(ctx: Ctx, rep: Report) {
    if (rep.span && rep.span.begin.idx === rep.span.end.idx) {
        return prettyPrintReport(ctx, {
            ...rep,
            span: undefined,
            pos: rep.span.begin,
        });
    }
    const { severity, msg } = rep;
    const origin = rep.origin ? `\x1b[1m${rep.origin}:\x1b[0m ` : "";
    console.error(
        `${origin}${severityColor(severity)}${severity}:\x1b[0m %c${msg}`,
        "color: white; font-weight: bold;",
    );
    if (!rep.file) {
        return;
    }
    const errorLineOffset = 2;
    const { absPath: path } = ctx.fileInfo(rep.file);
    const { line, col } = rep.span?.begin ?? rep.pos!;
    console.error(`    --> ./${path}:${line}:${col}`);
    if (rep.span) {
        const spanLines = ctx.fileSpanText(rep.file, rep.span).split("\n");
        spanLines.pop();
        if (spanLines.length == 1) {
            console.error(
                `${rep.span.begin.line.toString().padStart(4, " ")}| ${
                    spanLines[0]
                }`,
            );
            console.error(
                `    | ${severityColor(severity)}${
                    " ".repeat(rep.span.begin.col - 1)
                }${
                    "~".repeat(rep.span.end.col - rep.span.begin.col + 1)
                }\x1b[0m`,
            );
            return;
        }
        for (let i = 0; i < spanLines.length; i++) {
            console.error(
                `${(rep.span.begin.line + i).toString().padStart(4, " ")}| ${
                    spanLines[i]
                }`,
            );
            if (i == 0) {
                console.error(
                    `    | ${" ".repeat(rep.span.begin.col - 1)}${
                        severityColor(severity)
                    }${
                        "~".repeat(
                            spanLines[i].length - (rep.span.begin.col - 1),
                        )
                    }\x1b[0m`,
                );
            } else if (i == spanLines.length - 1) {
                console.error(
                    `    | ${severityColor(severity)}${
                        "~".repeat(rep.span.end.col)
                    }\x1b[0m`,
                );
            } else {
                console.error(
                    `    | ${severityColor(severity)}${
                        "~".repeat(spanLines[i].length)
                    }\x1b[0m`,
                );
            }
        }
    } else if (rep.pos) {
        console.error(
            `${rep.pos.line.toString().padStart(4, " ")}| ${
                ctx.filePosLineText(rep.file, rep.pos)
            }`,
        );
        console.error(
            `    | ${severityColor(severity)}${
                " ".repeat(rep.pos.col - 1)
            }^\x1b[0m`,
        );
    }
}

export function printStackTrace() {
    class StackTracer extends Error {
        constructor() {
            super("StackTracer");
        }
    }
    try {
        throw new StackTracer();
    } catch (error) {
        if (!(error instanceof StackTracer)) {
            throw error;
        }
        console.log(
            error.stack?.replace(
                "Error: StackTracer",
                "Stack trace:",
            ) ??
                error,
        );
    }
}
