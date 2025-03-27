import * as yaml from "jsr:@std/yaml";
import { Checker, Parser, Resolver } from "./front.ts";
import { MirGen } from "./mir_gen.ts";
import { FnStringifyer } from "./mir.ts";
import { LirGen } from "./lir_gen.ts";
import { ProgramStringifyer } from "./lir.ts";
import { AsmGen } from "./asm_gen.ts";
import { optimizeLir } from "./lir_optimize.ts";

async function main() {
    const inputFile = Deno.args[0];
    const outputFile = Deno.args[1];
    if (!inputFile || !outputFile) {
        throw new Error("incorrect arguments");
    }

    const text = await Deno.readTextFile(inputFile);

    const ast = new Parser(text).parse();
    // console.log("=== AST ===");
    // console.log(yaml.stringify(ast));

    const re = new Resolver(ast).resolve();
    const ch = new Checker(re);

    const optimize = true;

    const mirGen = new MirGen(re, ch);

    // console.log("=== MIR ===");
    // for (const stmt of ast) {
    //     if (stmt.kind.tag !== "fn") {
    //         throw new Error("only functions can compile top level");
    //     }
    //     const fnMir = mirGen.fnMir(stmt, stmt.kind);
    //     console.log(new FnStringifyer(fnMir).stringify());
    // }

    const lir = new LirGen(ast, mirGen, {
        optimize,
    }).generate();
    // console.log("=== LIR ===");
    // console.log(new ProgramStringifyer(lir).stringify());

    if (optimize) {
        optimizeLir(lir);
    }

    const asm = new AsmGen(lir).generate();
    // console.log("=== ASM ===");
    // console.log(asm);

    await Deno.writeTextFile(outputFile, asm);
}

main();
