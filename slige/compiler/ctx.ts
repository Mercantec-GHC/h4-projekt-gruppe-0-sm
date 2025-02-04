import * as ast from "./ast/mod.ts";
import {
    Pos,
    prettyPrintReport,
    printStackTrace,
    Report,
    Span,
} from "./diagnostics.ts";
import { DefId, File, IdentId, IdMap, Ids } from "./ids.ts";
export { type File } from "./ids.ts";

export class Ctx {
    private fileIds = new Ids<File>();
    private files = new IdMap<File, FileInfo>();
    private _entryFile?: File;

    private reports: Report[] = [];

    public fileHasChildWithIdent(file: File, childIdent: string): boolean {
        return this.files.get(file)!
            .subFiles.has(childIdent);
    }

    public addFile(
        ident: string,
        absPath: string,
        relPath: string,
        superFile: File | undefined,
        text: string,
    ): File {
        const file = this.fileIds.nextThenStep();
        this.files.set(file, {
            ident,
            absPath,
            relPath,
            superFile,
            subFiles: new Map(),
            text,
        });
        this._entryFile = this._entryFile ?? file;
        if (superFile) {
            this.files.get(superFile)!
                .subFiles.set(ident, file);
        }
        return file;
    }

    public addFileAst(file: File, ast: ast.File) {
        this.files.get(file)!.ast = ast;
    }

    public fileInfo(file: File): FileInfo {
        return this.files.get(file)!;
    }

    public entryFile(): File {
        if (!this._entryFile) {
            throw new Error();
        }
        return this._entryFile;
    }

    public iterFiles(): IteratorObject<File> {
        return this.files.keys();
    }

    //

    private identIds = new Ids<IdentId>();
    private identStringToId = new Map<string, IdentId>();
    private identIdToString = new IdMap<IdentId, string>();

    public internIdent(ident: string): IdentId {
        if (this.identStringToId.has(ident)) {
            return this.identStringToId.get(ident)!;
        }
        const id = this.identIds.nextThenStep();
        this.identStringToId.set(ident, id);
        this.identIdToString.set(id, ident);
        return id;
    }

    public identText(ident: IdentId): string {
        return this.identIdToString.get(ident)!;
    }

    public filePosLineText(file: File, pos: Pos): string {
        const fileTextLines = this.fileInfo(file).text.split("\n");
        return fileTextLines[pos.line - 1];
    }

    public fileSpanText(file: File, span: Span): string {
        let result = "";
        const fileTextLines = this.fileInfo(file).text.split("\n");

        for (let i = 0; i < fileTextLines.length; i++) {
            if (i > span.end.line - 1) {
                break;
            }
            if (i >= span.begin.line - 1) {
                result += fileTextLines[i] + "\n";
            }
        }
        return result;
    }

    //

    public report(rep: Report) {
        this.reports.push(rep);
        this.reportImmediately(rep);
    }

    public enableReportImmediately = false;
    public enableStacktrace = false;
    private reportImmediately(rep: Report) {
        if (this.enableReportImmediately) {
            prettyPrintReport(this, rep);
            if (this.enableStacktrace) {
                printStackTrace();
            }
        }
    }

    public printAsts() {
        for (const [_, info] of this.files) {
            console.log(`${info.absPath}:`);
            console.log(JSON.stringify(info.ast!, null, 2));
        }
    }
}

export type FileInfo = {
    ident: string;
    absPath: string;
    relPath: string;
    superFile?: File;
    subFiles: Map<string, File>;
    text: string;
    ast?: ast.File;
};
