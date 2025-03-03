import * as path from "jsr:@std/path";
import { Parser } from "./parse/parser.ts";
import * as ast from "@slige/ast";
import { Ctx, File } from "@slige/common";
import { Resolver } from "./resolve/resolver.ts";
import { Checker } from "./check/checker.ts";
import { ast_lower, mir_lower } from "@slige/middle";
import { HirStringifyer } from "@slige/stringify";

async function main() {
    const filePath = Deno.args[0];
    const compiler = new PackCompiler(filePath, new NullEmitter());
    compiler.enableDebug();
    await compiler.compile();
}

export type Pack = {
    rootMod: Mod;
};

export type Mod = null;

export interface PackEmitter {
    emit(pack: Pack): void;
}

export class NullEmitter implements PackEmitter {
    emit(pack: Pack): void {
    }
}

export class PackCompiler {
    private ctx = new Ctx();
    private astCx = new ast.Cx();

    public constructor(
        private entryFilePath: string,
        private emitter: PackEmitter,
    ) {}

    public async compile() {
        const [entryFile, entryFileAst] = await FileTreeAstCollector
            .fromEntryFile(this.ctx, this.astCx, this.entryFilePath)
            .collect();
        const resols = new Resolver(this.ctx, entryFileAst).resolve();
        const checker = new Checker(this.ctx, entryFileAst, resols);
        console.log(
            "=== HIR ===\n" +
                new HirStringifyer(this.ctx, checker)
                    .file(entryFileAst),
        );
        if (this.ctx.errorOccured()) {
            console.error("error(s) occurred.");
            Deno.exit(1);
        }
        const astLowerer = new ast_lower.AstLowerer(
            this.ctx,
            resols,
            checker,
            entryFileAst,
        );
        astLowerer.lower();
        if (this.ctx.errorOccured()) {
            console.error("error(s) occurred. stopping...");
            Deno.exit(1);
        }
        console.log("=== MIR ===\n" + astLowerer.mirString());
        if (this.ctx.errorOccured()) {
            console.error("error(s) occurred. stopping...");
            Deno.exit(1);
        }
        const mirLowerer = new mir_lower.MirLowerer(
            this.ctx,
            astLowerer.toArray(),
        );
        mirLowerer.lower();
        console.log("=== LIR ===\n" + mirLowerer.lirString());
    }

    public enableDebug() {
        this.ctx.enableReportImmediately = true;
        this.ctx.enableStacktrace = true;
    }
}

type _P = { file: File };
export class FileTreeAstCollector implements ast.Visitor<[_P]> {
    private subFilePromise = Promise.resolve();

    private constructor(
        private ctx: Ctx,
        private astCx: ast.Cx,
        private superFile: File | undefined,
        private ident: string,
        private absPath: string,
        private relPath: string,
    ) {}

    public static fromEntryFile(
        ctx: Ctx,
        astCx: ast.Cx,
        entryFilePath: string,
    ): FileTreeAstCollector {
        return new FileTreeAstCollector(
            ctx,
            astCx,
            undefined,
            "root",
            entryFilePath,
            entryFilePath,
        );
    }

    public async collect(): Promise<[File, ast.File]> {
        const text = await Deno.readTextFile(this.absPath);
        const file = this.ctx.addFile(
            this.ident,
            this.absPath,
            this.relPath,
            this.superFile,
            text,
        );
        const fileAst = new Parser(this.ctx, this.astCx, file).parse();
        this.ctx.addFileAst(file, fileAst);
        ast.visitFile(this, fileAst, { file });
        await this.subFilePromise;
        return [file, fileAst];
    }

    visitModFileItem(
        item: ast.Item,
        kind: ast.ModFileItem,
        { file }: _P,
    ): ast.VisitRes {
        const ident = this.ctx.identText(item.ident.id);
        const { filePath: relPath } = kind;
        const absPath = path.join(path.dirname(this.absPath), relPath);
        this.subFilePromise = this.subFilePromise
            .then(async () => {
                if (this.ctx.fileHasChildWithIdent(file, ident)) {
                    this.ctx.report({
                        severity: "fatal",
                        msg: `module '${ident}' already declared`,
                        file,
                        span: item.span,
                    });
                    Deno.exit(1);
                }
                const [modFile, modAst] = await new FileTreeAstCollector(
                    this.ctx,
                    this.astCx,
                    file,
                    ident,
                    absPath,
                    relPath,
                )
                    .collect();
                kind.file = modFile;
                kind.ast = modAst;
            });
        return "stop";
    }
}

main();
