import { Ctx } from "./ctx.ts";
import { prettyPrintReport } from "./diagnostics.ts";

const ctx = new Ctx();

const text = `
make an error here
`;

const biggerText = `
dont make error here
not here but start error here
and here
also here but not here
or here
`

const file = ctx.addFile(
    "root",
    "path/file.ts",
    "path/file.ts",
    undefined,
    text,
);

const biggerFile = ctx.addFile(
    "root",
    "path/file.ts",
    "path/file.ts",
    undefined,
    biggerText,
);

prettyPrintReport(ctx, {
    file,
    msg: "an error",
    severity: "fatal",
    origin: "compiler",
    span: {
        begin: { idx: 5, line: 2, col: 5 },
        end: { idx: 13, line: 2, col: 13 },
    },
});

prettyPrintReport(ctx, {
    file: biggerFile,
    msg: "an error",
    severity: "error",
    origin: "compiler",
    span: {
        begin: { idx: 6, line: 3, col: 14 },
        end: { idx: 13, line: 5, col: 13 },
    },
});

prettyPrintReport(ctx, {
    file,
    msg: "an error",
    severity: "warning",
    origin: "compiler",
    pos: {
        idx: 6, line: 2, col: 8 
    },
});
