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
    msg: string;
    file?: File;
    span?: Span;
    pos?: Pos;
};

export type ReportLocation =
    | { file: File; span: Span }
    | { file: File; pos: Pos };

function severityColor(
    severity: "fatal" | "error" | "warning" | "info",
): string {
    switch (severity) {
        case "fatal":
        case "error":
            return "red";
        case "warning":
            return "yellow";
        case "info":
            return "blue";
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
    const sevColor = severityColor(severity);
    console.error(
        `%c${severity}%c: %c${msg}`,
        `color: ${sevColor}; font-weight: bold`,
        "",
        "font-weight: bold;",
    );
    if (!rep.file) {
        return;
    }
    const { absPath: path } = ctx.fileInfo(rep.file);
    const { line, col } = rep.span?.begin ?? rep.pos!;
    console.error(
        `    %c--> %c./${path}:${line}:${col}`,
        "color: cyan",
        "",
    );
    if (rep.span) {
        const spanLines = ctx.fileSpanText(rep.file, rep.span).split("\n");
        spanLines.pop();
        if (spanLines.length == 1) {
            const sqgPad = " ".repeat(rep.span.begin.col - 1);
            console.error(
                `    %c|`,
                "color: cyan",
            );
            console.error(
                `${rep.span.begin.line.toString().padStart(4, " ")}%c| %c${
                    spanLines[0]
                }`,
                "color: cyan",
                "",
            );
            console.error(
                `    %c| %c${sqgPad}${
                    "~".repeat(rep.span.end.col - rep.span.begin.col + 1)
                }`,
                "color: cyan",
                `color: ${sevColor}; font-weight: bold`,
            );
            return;
        }
        for (let i = 0; i < spanLines.length; i++) {
            console.error(
                `${(rep.span.begin.line + i).toString().padStart(4, " ")}%c| ${
                    spanLines[i]
                }`,
                "color: cyan",
            );
            if (i == 0) {
                console.error(
                    `    %c| ${" ".repeat(rep.span.begin.col - 1)}%c${
                        "~".repeat(
                            spanLines[i].length - (rep.span.begin.col - 1),
                        )
                    }`,
                    "color: cyan",
                    `color: ${sevColor}; font-weight: bold`,
                );
            } else if (i == spanLines.length - 1) {
                console.error(
                    `    %c| %c${"~".repeat(rep.span.end.col)}\x1b[0m`,
                    "color: cyan",
                    `color: ${sevColor}; font-weight: bold`,
                );
            } else {
                console.error(
                    `    %c| %c${"~".repeat(spanLines[i].length)}\x1b[0m`,
                    "color: cyan",
                    `color: ${sevColor}; font-weight: bold`,
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
            `    %c| %c${" ".repeat(rep.pos.col - 1)}^\x1b[0m`,
            "color: cyan",
            `color: ${sevColor}; font-weight: bold`,
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
