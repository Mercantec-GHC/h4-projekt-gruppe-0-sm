import * as ast from "@slige/ast";
import {
    AstId,
    Ctx,
    exhausted,
    File,
    IdentId,
    IdMap,
    IdSet,
    Ok,
    Res,
    Span,
    todo,
} from "@slige/common";
import * as resolve from "@slige/resolve";
import {
    ElemDef,
    FieldDef,
    Ty,
    tyToString,
    Variant,
    VariantData,
} from "@slige/ty";

export class Checker {
    private stmtChecked = new IdSet<AstId>();
    private itemTys = new IdMap<AstId, Ty>();
    private exprTys = new IdMap<AstId, Ty>();
    private tyTys = new IdMap<AstId, Ty>();
    private patTys = new IdMap<AstId, Ty>();

    private currentFile: File;

    public constructor(
        private ctx: Ctx,
        private entryFileAst: ast.File,
        private re: resolve.Resols,
    ) {
        this.currentFile = ctx.entryFile();
    }

    private checkBlock(block: ast.Block, expected: Ty): Ty {
        return block.expr &&
                this.checkExpr(block.expr, expected) ||
            Ty({ tag: "null" });
    }

    private checkLetStmt(stmt: ast.Stmt, kind: ast.LetStmt) {
        if (this.stmtChecked.has(stmt.id)) {
            return;
        }

        const exprTy = kind.expr && Ok(this.exprTy(kind.expr));
        const tyTy = kind.ty && Ok(this.tyTy(kind.ty));
        const ty = exprTy !== undefined && tyTy !== undefined
            ? this.resolveTys(exprTy.val, tyTy.val)
            : exprTy || tyTy;

        this.stmtChecked.add(stmt.id);

        if (ty === undefined) {
            this.assignPatTy(kind.pat, Ty({ tag: "error" }));
            this.report("type amfibious, specify type or value", stmt.span);
            return Ty({ tag: "error" });
        }

        if (!ty.ok) {
            this.assignPatTy(kind.pat, Ty({ tag: "error" }));
            this.report(ty.val, stmt.span);
            return Ty({ tag: "error" });
        }

        const res = this.assignPatTy(kind.pat, ty.val);
        if (!res.ok) {
            this.report(res.val.msg, res.val.span);
            return Ty({ tag: "error" });
        }
    }

    private assignPatTy(
        pat: ast.Pat,
        ty: Ty,
    ): Res<void, { msg: string; span: Span }> {
        this.patTys.set(pat.id, ty);
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                // don't report, already reported
                return Res.Ok(undefined);
            case "bind":
                return Ok(undefined);
            case "path":
                return todo();
            case "tuple": {
                if (k.path) {
                    const re = this.re.pathRes(k.path.id);
                    if (re.kind.tag === "variant") {
                        if (ty.kind.tag !== "enum") {
                            return Res.Err({
                                msg: "type/pattern mismatch",
                                span: pat.span,
                            });
                        }
                        const variantTy =
                            ty.kind.variants[re.kind.variantIdx].data;
                        if (variantTy.tag !== "tuple") {
                            return Res.Err({
                                msg: "type is not a tuple variant",
                                span: pat.span,
                            });
                        }
                        const datak = re.kind.variant.data.kind;
                        if (datak.tag !== "tuple") {
                            return Res.Err({
                                msg: "variant is not a tuple",
                                span: pat.span,
                            });
                        }
                        if (k.elems.length !== datak.elems.length) {
                            return Res.Err({
                                msg: `incorrect amount of elements, expected ${datak.elems.length} got ${k.elems.length}`,
                                span: pat.span,
                            });
                        }
                        for (const [i, pat] of k.elems.entries()) {
                            const res = this.assignPatTy(
                                pat,
                                variantTy.elems[i].ty,
                            );
                            if (!res.ok) {
                                return res;
                            }
                        }
                        return Res.Ok(undefined);
                    }
                }
                return todo();
            }
            case "struct": {
                if (k.path) {
                    const re = this.re.pathRes(k.path.id);
                    if (re.kind.tag === "variant") {
                        if (ty.kind.tag !== "enum") {
                            return Res.Err({
                                msg: "type/pattern mismatch",
                                span: pat.span,
                            });
                        }
                        const variantTy =
                            ty.kind.variants[re.kind.variantIdx].data;
                        if (variantTy.tag !== "struct") {
                            return Res.Err({
                                msg: "type is not a struct variant",
                                span: pat.span,
                            });
                        }
                        const datak = re.kind.variant.data.kind;
                        if (datak.tag !== "struct") {
                            return Res.Err({
                                msg: "variant is not a struct",
                                span: pat.span,
                            });
                        }
                        const fieldIdents = datak.fields
                            .reduce(
                                (
                                    map,
                                    field,
                                ) => (map.set(field.ident!.id, field), map),
                                new Map(),
                            );
                        for (const field of k.fields) {
                            if (!fieldIdents.has(field.ident.id)) {
                                return Res.Err({
                                    msg: `no field '${field.ident.text}' on  type`,
                                    span: pat.span,
                                });
                            }
                            const res = this.assignPatTy(
                                field.pat,
                                fieldIdents.get(field.ident.id)!.ty,
                            );
                            if (!res.ok) {
                                return res;
                            }
                            fieldIdents.delete(field.ident.id);
                        }
                        if (fieldIdents.size !== 0) {
                            return Res.Err({
                                msg: `fields ${
                                    fieldIdents
                                        .values()
                                        .map((field) => `'${field.ident.text}'`)
                                        .toArray()
                                        .join(", ")
                                } not covered`,
                                span: pat.span,
                            });
                        }
                        return Res.Ok(undefined);
                    }
                }
                return todo();
            }
        }
        exhausted(k);
    }

    public checkBreakStmt(stmt: ast.Stmt, kind: ast.BreakStmt) {
        if (this.stmtChecked.has(stmt.id)) {
            return;
        }
        this.stmtChecked.add(stmt.id);
        const re = this.re.loopRes(stmt.id);
        if (re.tag === "error") {
            return;
        }
        if (re.tag !== "loop") {
            if (kind.expr) {
                this.report(
                    `'${re.tag}'-style loop cannot break with value`,
                    stmt.span,
                );
                return;
            }
            return;
        }
        const exTy = this.exprTys.get(re.expr.id)!;
        if (!kind.expr) {
            const ty = Ty({ tag: "null" });
            const tyRes = this.resolveTys(ty, exTy);
            if (!tyRes.ok) {
                this.report(tyRes.val, stmt.span);
                return;
            }
            this.exprTys.set(re.expr.id, tyRes.val)!;
            return;
        }
        const ty = this.exprTy(kind.expr, exTy);
        if (ty.kind.tag !== "error") {
            this.exprTys.set(re.expr.id, ty);
        }
    }

    public checkAssignStmt(stmt: ast.Stmt, kind: ast.AssignStmt) {
        if (this.stmtChecked.has(stmt.id)) {
            return;
        }
        this.stmtChecked.add(stmt.id);
        switch (kind.assignType) {
            case "=": {
                const valTy = this.exprTy(kind.value);
                this.checkAssignableExpr(
                    kind.subject,
                    valTy,
                    kind.subject.span,
                );
                return;
            }
            case "+=":
            case "-=": {
                const re = this.re.exprRes(kind.subject.id);
                if (re.kind.tag !== "local") {
                    this.report(
                        "cannot assign to expression",
                        kind.subject.span,
                    );
                    this.exprTys.set(kind.subject.id, Ty({ tag: "error" }));
                    return;
                }
                const patRe = this.re.patRes(re.kind.id);
                const patTy = this.patTy(patRe.pat);
                const tyRes = this.resolveTys(patTy, Ty({ tag: "int" }));
                if (!tyRes.ok) {
                    this.report(
                        "cannot increment/decrement non-integer",
                        kind.subject.span,
                    );
                    this.exprTys.set(kind.subject.id, Ty({ tag: "error" }));
                    return;
                }
                const valTy = this.exprTy(kind.value);
                const valTyRes = this.resolveTys(valTy, Ty({ tag: "int" }));
                if (!valTyRes.ok) {
                    if (valTy.kind.tag !== "error") {
                        this.report(
                            "cannot increment/decrement with non-integer",
                            kind.value.span,
                        );
                    }
                    this.exprTys.set(kind.subject.id, Ty({ tag: "error" }));
                    return;
                }
                this.exprTys.set(kind.subject.id, valTyRes.val);
                return;
            }
        }
        exhausted(kind.assignType);
    }

    private checkAssignableExpr(expr: ast.Expr, ty: Ty, valSpan: Span) {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                return;
            case "path": {
                if (k.qty || k.path.segments.length !== 1) {
                    this.report("cannot assign to expression", expr.span);
                    return;
                }
                const re = this.re.exprRes(expr.id);
                if (re.kind.tag !== "local") {
                    this.report("cannot assign to expression", expr.span);
                    return;
                }
                const patRe = this.re.patRes(re.kind.id);
                if (patRe.pat.kind.tag !== "bind") {
                    throw new Error();
                }
                if (!patRe.pat.kind.mut) {
                    this.report("local is not declared mutable", expr.span);
                    return;
                }
                return;
            }
            case "group":
                this.checkAssignableExpr(expr, ty, valSpan);
                return;
            case "array":
            case "repeat":
            case "struct":
            case "deref":
            case "elem":
            case "field":
            case "index":
                return todo();
            case "null":
            case "int":
            case "bool":
            case "str":
            case "ref":
            case "call":
            case "unary":
            case "binary":
            case "block":
            case "if":
            case "match":
            case "loop":
            case "while":
            case "for":
            case "c_for":
                this.report("cannot assign to expression", expr.span);
                return;
        }
        exhausted(k);
    }

    public enumItemTy(item: ast.Item, kind: ast.EnumItem): Ty {
        return this.itemTys.get(item.id) ?? this.checkEnumItem(item, kind);
    }

    private checkEnumItem(item: ast.Item, kind: ast.EnumItem): Ty {
        const variantIdents = new Set<IdentId>();
        const variants: Variant[] = [];
        for (const variant of kind.variants) {
            if (variantIdents.has(variant.ident.id)) {
                this.report(`variant name already defined`, variant.span);
                return Ty({ tag: "error" });
            }
            variantIdents.add(variant.ident.id);
            variants.push({
                ident: variant.ident.id,
                data: this.checkVariantData(variant.data),
            });
        }
        return Ty({ tag: "enum", item, kind, variants });
    }

    public structItemTy(item: ast.Item, kind: ast.StructItem): Ty {
        return this.itemTys.get(item.id) ?? this.checkStructItem(item, kind);
    }

    private checkStructItem(item: ast.Item, kind: ast.StructItem): Ty {
        const data = this.checkVariantData(kind.data);
        return Ty({ tag: "struct", item, kind, data });
    }

    private checkVariantData(data: ast.VariantData): VariantData {
        const k = data.kind;
        switch (k.tag) {
            case "error":
                return { tag: "error" };
            case "unit":
                return { tag: "unit" };
            case "tuple": {
                const elems = k.elems
                    .map(({ ty, pub }): ElemDef => ({
                        ty: this.tyTy(ty),
                        pub,
                    }));
                return { tag: "tuple", elems };
            }
            case "struct": {
                const fields = k.fields
                    .map(({ ident, ty, pub }): FieldDef => {
                        if (!ident) {
                            throw new Error();
                        }
                        return { ident: ident.id, ty: this.tyTy(ty), pub };
                    });
                return { tag: "struct", fields };
            }
        }
        exhausted(k);
    }

    public fnItemTy(item: ast.Item, kind: ast.FnItem): Ty {
        return this.itemTys.get(item.id) ?? this.checkFnItem(item, kind);
    }

    private checkFnItem(item: ast.Item, kind: ast.FnItem): Ty {
        const params = kind.params.map((param) => this.tyTy(param.ty));
        const returnTy = kind.returnTy && this.tyTy(kind.returnTy) ||
            Ty({ tag: "null" });
        return Ty({ tag: "fn", item, kind, params, returnTy });
    }

    public exprTy(expr: ast.Expr, expected = Ty({ tag: "unknown" })): Ty {
        return this.exprTys.get(expr.id) ||
            this.checkExpr(expr, expected);
    }

    private checkExpr(expr: ast.Expr, expected: Ty): Ty {
        const k = expr.kind;
        switch (k.tag) {
            case "error":
                return Ty({ tag: "error" });
            case "path":
                return this.checkPathExpr(expr, k, expected);
            case "null":
                return Ty({ tag: "null" });
            case "int":
                return Ty({ tag: "int" });
            case "bool":
                return Ty({ tag: "bool" });
            case "str":
                return todo();
            case "group":
                return todo();
            case "array":
                return todo();
            case "repeat":
                return todo();
            case "struct":
                return this.checkStructExpr(expr, k, expected);
            case "ref":
                return todo();
            case "deref":
                return todo();
            case "elem":
                return todo();
            case "field":
                return todo();
            case "index":
                return todo();
            case "call":
                return this.checkCallExpr(expr, k, expected);
            case "unary":
                return todo();
            case "binary":
                return this.checkBinaryExpr(expr, k, expected);
            case "block":
                return this.checkBlock(k.block, expected);
            case "if":
                return this.checkIfExpr(expr, k, expected);
            case "match":
                return this.checkMatchExpr(expr, k, expected);
            case "loop":
                return this.checkLoopExpr(expr, k, expected);
            case "while":
                return this.checkWhileExpr(expr, k, expected);
            case "for":
                return todo();
            case "c_for":
                return this.checkCForExpr(expr, k, expected);
        }
        exhausted(k);
    }

    private checkPathExpr(
        expr: ast.Expr,
        kind: ast.PathExpr,
        expected: Ty,
    ): Ty {
        const res = this.re.exprRes(expr.id);
        switch (res.kind.tag) {
            case "error":
                return Ty({ tag: "error" });
            case "enum":
                return todo("return enum type here");
            case "struct": {
                const data = res.kind.kind.data;
                switch (data.kind.tag) {
                    case "error":
                        return Ty({ tag: "error" });
                    case "struct":
                        this.report(
                            "expected value, got struct type",
                            expr.span,
                        );
                        return Ty({ tag: "error" });
                    case "unit":
                        //return this.structItemTy(res.kind.item, res.kind.kind);
                        return todo();
                    case "tuple":
                        this.report(
                            "expected value, got struct type",
                            expr.span,
                        );
                        return Ty({ tag: "error" });
                }
                return exhausted(data.kind);
            }
            case "variant": {
                const { item, kind } = res.kind;
                const data = res.kind.variant.data;
                switch (data.kind.tag) {
                    case "error":
                        return Ty({ tag: "error" });
                    case "struct":
                        this.report(
                            "expected value, got struct type",
                            expr.span,
                        );
                        return Ty({ tag: "error" });
                    case "unit":
                        return this.enumItemTy(item, kind);
                    case "tuple":
                        this.report(
                            "expected value, got struct type",
                            expr.span,
                        );
                        return Ty({ tag: "error" });
                }
                return exhausted(data.kind);
            }
            case "field":
                throw new Error();
            case "fn": {
                const fn = res.kind.item;
                const ty = this.fnItemTy(fn, res.kind.kind);
                const resu = this.resolveTys(ty, expected);
                if (!resu.ok) {
                    this.report(resu.val, expr.span);
                    return Ty({ tag: "error" });
                }
                return resu.val;
            }
            case "local": {
                const patRes = this.re.patRes(res.kind.id);
                const ty = this.patTy(patRes.pat);
                const resu = this.resolveTys(ty, expected);
                if (!resu.ok) {
                    this.report(resu.val, expr.span);
                    return Ty({ tag: "error" });
                }
                return resu.val;
            }
        }
        exhausted(res.kind);
    }

    private checkStructExpr(
        expr: ast.Expr,
        kind: ast.StructExpr,
        expected: Ty,
    ): Ty {
        if (!kind.path) {
            return todo();
        }
        const res = this.re.pathRes(kind.path.id);
        let ty: Ty;
        if (res.kind.tag === "struct") {
            ty = this.structItemTy(res.kind.item, res.kind.kind);
        } else if (res.kind.tag === "variant") {
            ty = this.enumItemTy(res.kind.item, res.kind.kind);
        } else {
            this.report("type is not a struct", kind.path.span);
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }
        this.exprTys.set(expr.id, ty);
        if (ty.kind.tag === "error") {
            return ty;
        }
        let data: VariantData;
        if (ty.kind.tag === "struct") {
            data = ty.kind.data;
        } else if (ty.kind.tag === "enum") {
            if (res.kind.tag !== "variant") {
                throw new Error();
            }
            data = ty.kind.variants[res.kind.variantIdx].data;
        } else {
            throw new Error();
        }
        if (data.tag !== "struct") {
            this.report("struct data not a struct", kind.path.span);
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }
        const notCovered = new Set<FieldDef>();
        for (const field of data.fields) {
            notCovered.add(field);
        }
        for (const field of kind.fields) {
            const found = data.fields
                .find((f) => f.ident === field.ident.id);
            if (!found) {
                this.report(`no field named '${field.ident.text}'`, field.span);
                return ty;
            }
            const fieldTy = this.exprTy(field.expr);
            const tyRes = this.resolveTys(fieldTy, found.ty);
            if (!tyRes.ok) {
                this.report(tyRes.val, field.span);
                return ty;
            }
            notCovered.delete(found);
        }
        if (notCovered.size !== 0) {
            this.report(
                `fields ${
                    notCovered
                        .keys()
                        .toArray()
                        .map((field) => `'${this.ctx.identText(field.ident)}'`)
                        .join(", ")
                } not covered`,
                expr.span,
            );
        }
        return ty;
    }

    private checkCallExpr(
        expr: ast.Expr,
        kind: ast.CallExpr,
        expected: Ty,
    ): Ty {
        if (this.callExprIsTupleVariantCtor(kind)) {
            return this.checkCallExprTupleVariantCtor(expr, kind, expected);
        }
        if (this.callExprIsTupleStructCtor(kind)) {
            return this.checkCallExprTupleStructCtor(expr, kind, expected);
        }
        const fnTy = this.exprTy(kind.expr);
        if (fnTy.kind.tag !== "fn") {
            if (fnTy.kind.tag === "error") {
                return fnTy;
            }
            const ty = tyToString(this.ctx, fnTy);
            console.log(kind.expr.span);
            this.report(`type '${ty}' not fucking callable`, kind.expr.span);
            return Ty({ tag: "error" });
        }
        const paramTys = fnTy.kind.params;
        if (paramTys.length !== kind.args.length) {
            this.report(
                "not enough/too many fucking arguments",
                kind.expr.span,
            );
            return Ty({ tag: "error" });
        }
        for (const [i, arg] of kind.args.entries()) {
            this.checkExpr(arg, paramTys[i]);
        }

        const ty = fnTy.kind.returnTy;
        this.exprTys.set(expr.id, ty);
        return ty;
    }

    private callExprIsTupleVariantCtor(kind: ast.CallExpr): boolean {
        if (kind.expr.kind.tag !== "path") {
            return false;
        }
        const res = this.re.exprRes(kind.expr.id);
        return res.kind.tag === "variant" &&
            res.kind.variant.data.kind.tag === "tuple";
    }

    private checkCallExprTupleVariantCtor(
        expr: ast.Expr,
        kind: ast.CallExpr,
        expected: Ty,
    ): Ty {
        if (kind.expr.kind.tag !== "path") {
            throw new Error();
        }
        const res = this.re.exprRes(kind.expr.id);
        if (res.kind.tag !== "variant") {
            throw new Error();
        }
        const ty = this.enumItemTy(res.kind.item, res.kind.kind);
        this.exprTys.set(expr.id, ty);
        if (ty.kind.tag === "error") {
            return ty;
        }
        if (ty.kind.tag !== "enum") {
            throw new Error();
        }
        const data = ty.kind.variants[res.kind.variantIdx].data;
        if (data.tag !== "tuple") {
            this.report(
                "variant data not a tuple",
                kind.expr.kind.path.span,
            );
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }
        for (const [i, arg] of kind.args.entries()) {
            const argTy = this.exprTy(arg);
            const tyRes = this.resolveTys(argTy, data.elems[i].ty);
            if (!tyRes.ok) {
                this.report(tyRes.val, arg.span);
                return ty;
            }
        }
        return ty;
    }

    private callExprIsTupleStructCtor(kind: ast.CallExpr): boolean {
        if (kind.expr.kind.tag !== "path") {
            return false;
        }
        const res = this.re.exprRes(kind.expr.id);
        return res.kind.tag === "struct";
    }

    private checkCallExprTupleStructCtor(
        expr: ast.Expr,
        kind: ast.CallExpr,
        expected: Ty,
    ): Ty {
        if (kind.expr.kind.tag !== "path") {
            throw new Error();
        }
        const res = this.re.exprRes(kind.expr.id);
        if (res.kind.tag !== "struct") {
            throw new Error();
        }
        const ty = this.structItemTy(res.kind.item, res.kind.kind);
        this.exprTys.set(expr.id, ty);
        if (ty.kind.tag === "error") {
            return ty;
        }
        if (ty.kind.tag !== "struct") {
            throw new Error();
        }
        const data = ty.kind.data;
        if (data.tag !== "tuple") {
            this.report(
                "struct data not a tuple",
                kind.expr.kind.path.span,
            );
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }
        for (const [i, arg] of kind.args.entries()) {
            const argTy = this.exprTy(arg);
            const tyRes = this.resolveTys(argTy, data.elems[i].ty);
            if (!tyRes.ok) {
                this.report(tyRes.val, arg.span);
                return ty;
            }
        }
        return ty;
    }

    private checkBinaryExpr(
        expr: ast.Expr,
        kind: ast.BinaryExpr,
        expected: Ty,
    ): Ty {
        switch (kind.binaryType) {
            case "+":
            case "-":
            case "*":
            case "/": {
                const operandRes = this.resolveTys(
                    this.exprTy(kind.left),
                    this.exprTy(kind.right),
                );
                if (!operandRes.ok) {
                    this.exprTys.set(expr.id, Ty({ tag: "error" }));
                    this.report(operandRes.val, expr.span);
                    return Ty({ tag: "error" });
                }
                const operatorRes = this.resolveTys(
                    operandRes.val,
                    Ty({ tag: "int" }),
                );
                if (!operatorRes.ok) {
                    this.exprTys.set(expr.id, Ty({ tag: "error" }));
                    this.report(operatorRes.val, expr.span);
                    return Ty({ tag: "error" });
                }
                this.exprTys.set(expr.id, operatorRes.val);
                return operandRes.val;
            }
            case "==":
            case "!=":
            case "<":
            case ">":
            case "<=":
            case ">=":
            case "or":
            case "and": {
                const operandRes = this.resolveTys(
                    this.exprTy(kind.left),
                    this.exprTy(kind.right),
                );
                if (!operandRes.ok) {
                    this.exprTys.set(expr.id, Ty({ tag: "error" }));
                    this.report(operandRes.val, expr.span);
                    return Ty({ tag: "error" });
                }
                const ty = Ty({ tag: "bool" });
                this.exprTys.set(expr.id, ty);
                return ty;
            }
        }
    }

    private checkIfExpr(
        expr: ast.Expr,
        kind: ast.IfExpr,
        expected: Ty,
    ): Ty {
        const cond = this.exprTy(kind.cond);
        const condRes = this.resolveTys(cond, Ty({ tag: "bool" }));
        if (!condRes.ok) {
            this.exprTys.set(expr.id, Ty({ tag: "error" }));
            this.report("if-condition must be a boolean", kind.cond.span);
            return Ty({ tag: "error" });
        }
        const truthy = this.exprTy(kind.truthy);
        if (!kind.falsy) {
            const truthyRes = this.resolveTys(
                truthy,
                Ty({ tag: "null" }),
            );
            if (!truthyRes.ok) {
                this.exprTys.set(expr.id, Ty({ tag: "error" }));
                this.report(
                    "if there isn't a falsy-clause, then the truthy clause must evaluate to null",
                    kind.truthy.span,
                );
                return Ty({ tag: "error" });
            }
            this.exprTys.set(expr.id, Ty({ tag: "null" }));
            return Ty({ tag: "null" });
        }
        const falsy = this.exprTy(kind.falsy);
        const bothRes = this.resolveTys(truthy, falsy);
        if (!bothRes.ok) {
            this.exprTys.set(expr.id, Ty({ tag: "error" }));
            this.report(bothRes.val, kind.truthy.span);
            return Ty({ tag: "error" });
        }
        this.exprTys.set(expr.id, bothRes.val);
        return bothRes.val;
    }

    private checkMatchExpr(
        expr: ast.Expr,
        kind: ast.MatchExpr,
        expected: Ty,
    ): Ty {
        const ty = this.exprTy(kind.expr);
        for (const arm of kind.arms) {
            const res = this.assignPatTy(arm.pat, ty);
            if (!res.ok) {
                this.report(res.val.msg, res.val.span);
                continue;
            }
        }
        const tyRes = kind.arms
            .reduce<Res<Ty, string>>((earlier, arm) => {
                if (!earlier.ok) {
                    return earlier;
                }
                const exprTy = this.exprTy(arm.expr, earlier.val);
                return this.resolveTys(exprTy, earlier.val);
            }, Res.Ok(Ty({ tag: "unknown" })));
        if (!tyRes.ok) {
            this.report(tyRes.val, expr.span);
            this.exprTys.set(expr.id, Ty({ tag: "error" }));
            return Ty({ tag: "error" });
        }
        this.exprTys.set(expr.id, tyRes.val);
        return tyRes.val;
    }

    private checkLoopExpr(
        expr: ast.Expr,
        kind: ast.LoopExpr,
        expected: Ty,
    ): Ty {
        this.exprTys.set(expr.id, expected);

        const body = this.exprTy(kind.body, Ty({ tag: "unknown" }));
        if (body.kind.tag !== "null") {
            if (body.kind.tag !== "error") {
                this.report("loop body must not yield a value", kind.body.span);
            }
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }

        for (const { stmt, kind } of this.re.loopBreaks(expr.id)) {
            this.checkBreakStmt(stmt, kind);
        }

        return this.exprTys.get(expr.id)!;
    }

    private checkWhileExpr(
        expr: ast.Expr,
        kind: ast.LoopExpr,
        expected: Ty,
    ): Ty {
        const ty = Ty({ tag: "null" });
        this.exprTys.set(expr.id, ty);

        const body = this.exprTy(kind.body, Ty({ tag: "unknown" }));
        if (body.kind.tag !== "null") {
            if (body.kind.tag !== "error") {
                this.report("loop body must not yield a value", kind.body.span);
            }
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }

        for (const { stmt, kind } of this.re.loopBreaks(expr.id)) {
            this.checkBreakStmt(stmt, kind);
        }

        return ty;
    }

    private checkCForExpr(
        expr: ast.Expr,
        kind: ast.LoopExpr,
        expected: Ty,
    ): Ty {
        const ty = Ty({ tag: "null" });
        this.exprTys.set(expr.id, ty);

        const body = this.exprTy(kind.body, Ty({ tag: "unknown" }));
        if (body.kind.tag !== "null") {
            if (body.kind.tag !== "error") {
                this.report("loop body must not yield a value", kind.body.span);
            }
            const ty = Ty({ tag: "error" });
            this.exprTys.set(expr.id, ty);
            return ty;
        }

        for (const { stmt, kind } of this.re.loopBreaks(expr.id)) {
            this.checkBreakStmt(stmt, kind);
        }

        return ty;
    }

    private tyTy(ty: ast.Ty): Ty {
        return this.tyTys.get(ty.id) ||
            this.checkTy(ty);
    }

    private checkTy(ty: ast.Ty): Ty {
        const k = ty.kind;
        switch (k.tag) {
            case "error":
                return Ty({ tag: "error" });
            case "null":
            case "int":
                return Ty({ tag: "int" });
            case "bool":
            case "str":
                return todo(k.tag);
            case "path": {
                const re = this.re.tyRes(ty.id);
                const k = re.kind;
                switch (k.tag) {
                    case "error":
                        return Ty({ tag: "error" });
                    case "enum":
                        return this.enumItemTy(k.item, k.kind);
                    case "struct":
                        return this.structItemTy(k.item, k.kind);
                    case "fn":
                    case "variant":
                    case "field":
                    case "local":
                        return todo();
                }
                exhausted(k);
                return todo();
            }
            case "ref":
            case "ptr":
            case "slice":
            case "array":
            case "anon_struct":
                return todo(k.tag);
        }
        exhausted(k);
    }

    public patTy(pat: ast.Pat): Ty {
        return this.patTys.get(pat.id) ||
            this.checkPat(pat);
    }

    private checkPat(pat: ast.Pat): Ty {
        const patRes = this.re.patRes(pat.id);
        const k = pat.kind;
        switch (k.tag) {
            case "error":
                return todo();
            case "bind": {
                switch (patRes.kind.tag) {
                    case "fn_param": {
                        const fnTy = this.fnItemTy(
                            patRes.kind.item,
                            patRes.kind.kind,
                        );
                        if (fnTy.kind.tag !== "fn") {
                            throw new Error();
                        }
                        const paramTy = fnTy.kind.params[patRes.kind.paramIdx];
                        this.assignPatTy(
                            patRes.kind.kind.params[patRes.kind.paramIdx].pat,
                            paramTy,
                        );
                        const ty = this.patTy(pat);
                        this.patTys.set(pat.id, ty);
                        return ty;
                    }
                    case "let": {
                        this.checkLetStmt(patRes.kind.stmt, patRes.kind.kind);
                        return this.patTy(pat);
                    }
                    case "match": {
                        this.checkMatchExpr(
                            patRes.kind.expr,
                            patRes.kind.kind,
                            Ty({ tag: "unknown" }),
                        );
                        return this.patTy(pat);
                    }
                }
                exhausted(patRes.kind);
                return todo();
            }
            case "path":
            case "tuple":
            case "struct":
                return todo();
        }
        exhausted(k);
    }

    private resolveTys(a: Ty, b: Ty): Res<Ty, string> {
        if (a.kind.tag === "error" || b.kind.tag === "error") {
            return Res.Ok(Ty({ tag: "error" }));
        }
        if (b.kind.tag === "unknown") {
            return Res.Ok(a);
        }
        const incompat = () => {
            const as = tyToString(this.ctx, a);
            const bs = tyToString(this.ctx, b);
            return Res.Err(
                `type '${as}' not compatible with type '${bs}'`,
            );
        };
        switch (a.kind.tag) {
            case "unknown":
                return this.resolveTys(b, a);
            case "null": {
                if (b.kind.tag !== "null") {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "int": {
                if (b.kind.tag !== "int") {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "bool": {
                if (b.kind.tag !== "bool") {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "fn": {
                if (b.kind.tag !== "fn") {
                    return incompat();
                }
                if (b.kind.item.id === a.kind.item.id) {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "enum": {
                if (b.kind.tag !== "enum") {
                    return incompat();
                }
                if (a.kind.item.id !== b.kind.item.id) {
                    return incompat();
                }
                return Res.Ok(a);
            }
            case "struct": {
                if (b.kind.tag !== "struct") {
                    return incompat();
                }
                if (a.kind.item.id !== b.kind.item.id) {
                    return incompat();
                }
                return Res.Ok(a);
            }
        }
        exhausted(a.kind);
    }

    private report(msg: string, span: Span) {
        this.ctx.report({
            severity: "error",
            file: this.currentFile,
            span,
            msg,
        });
    }
}
