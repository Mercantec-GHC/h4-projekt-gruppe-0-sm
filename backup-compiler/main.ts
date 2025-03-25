import * as yaml from "jsr:@std/yaml";
import { Checker, Parser, Resolver } from "./front.ts";
import { MirGen } from "./mir_gen.ts";
import { FnStringifyer } from "./mir.ts";
import { LirGen } from "./lir_gen.ts";
import { ProgramStringifyer } from "./lir.ts";
import { AsmGen } from "./asm_gen.ts";

async function main() {
    const text = await Deno.readTextFile(Deno.args[0]);

    const ast = new Parser(text).parse();
    console.log("=== AST ===");
    console.log(yaml.stringify(ast));

    const re = new Resolver(ast).resolve();
    const ch = new Checker(re);

    const mirGen = new MirGen(re, ch);

    console.log("=== MIR ===");
    for (const stmt of ast) {
        if (stmt.kind.tag !== "fn") {
            throw new Error("only functions can compile top level");
        }
        const fnMir = mirGen.fnMir(stmt, stmt.kind);
        console.log(new FnStringifyer(fnMir).stringify());
    }

    const lir = new LirGen(ast, mirGen).generate();
    console.log("=== LIR ===");
    console.log(new ProgramStringifyer(lir).stringify());

    const asm = new AsmGen(lir).generate();
    console.log("=== ASM ===");
    console.log(asm);
}

main();
