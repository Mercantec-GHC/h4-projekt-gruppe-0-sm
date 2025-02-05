import { todo } from "./util.ts";

//

export type File = IdBase & { readonly _: unique symbol };
export type IdentId = IdBase & { readonly _: unique symbol };
export type AstId = IdBase & { readonly _: unique symbol };

export type DefId = IdBase & { readonly _: unique symbol };

//

export type IdBase = { rawId: number };

export type IdRaw<IdType extends IdBase> = IdType["rawId"];

export const idRaw = <IdType extends IdBase>(id: IdType): IdRaw<IdType> =>
    id.rawId;

export const idFromRaw = <IdType extends IdBase>(
    rawId: IdRaw<IdType>,
): IdType => ({ rawId } as IdType);

export class Ids<IdType extends IdBase> {
    private next = 0;
    public nextThenStep(): IdType {
        const rawId = this.next;
        this.next += 1;
        return idFromRaw(rawId);
    }
}
export class IdSet<Id extends IdBase> implements Set<Id> {
    private set = new Set<IdRaw<Id>>();

    add(value: Id): this {
        this.set.add(idRaw(value));
        return this;
    }
    clear(): void {
        this.set.clear();
    }
    delete(value: Id): boolean {
        return this.set.delete(idRaw(value));
    }
    forEach(
        callbackfn: (value: Id, value2: Id, set: Set<Id>) => void,
        thisArg?: unknown,
    ): void {
        this.set.forEach(
            (v1, v2) => callbackfn(idFromRaw(v1), idFromRaw(v2), this),
            thisArg,
        );
    }
    has(value: Id): boolean {
        return this.set.has(idRaw(value));
    }
    get size(): number {
        return this.set.size;
    }
    entries(): SetIterator<[Id, Id]> {
        return this.set.entries()
            .map(([v1, v2]) => [idFromRaw(v1), idFromRaw(v2)]);
    }
    keys(): SetIterator<Id> {
        return this.set.keys()
            .map((v) => idFromRaw(v));
    }
    values(): SetIterator<Id> {
        return this.set.values()
            .map((v) => idFromRaw(v));
    }
    union<U>(_other: ReadonlySetLike<U>): Set<Id | U> {
        return todo();
    }
    intersection<U>(_other: ReadonlySetLike<U>): Set<Id & U> {
        return todo();
    }
    difference<U>(_other: ReadonlySetLike<U>): Set<Id> {
        return todo();
    }
    symmetricDifference<U>(_other: ReadonlySetLike<U>): Set<Id | U> {
        return todo();
    }
    isSubsetOf(_other: ReadonlySetLike<unknown>): boolean {
        return todo();
    }
    isSupersetOf(_other: ReadonlySetLike<unknown>): boolean {
        return todo();
    }
    isDisjointFrom(_other: ReadonlySetLike<unknown>): boolean {
        return todo();
    }
    [Symbol.iterator](): SetIterator<Id> {
        return this.set[Symbol.iterator]().map((v) => idFromRaw(v));
    }
    get [Symbol.toStringTag](): string {
        return this.set[Symbol.toStringTag];
    }
}

export class IdMap<Id extends IdBase, V> implements Map<Id, V> {
    private map = new Map<IdRaw<Id>, V>();

    set(id: Id, val: V): this {
        this.map.set(idRaw(id), val);
        return this;
    }

    get(id: Id): V | undefined {
        return this.map.get(idRaw(id));
    }

    has(id: Id): boolean {
        return this.map.has(idRaw(id));
    }

    keys(): MapIterator<Id> {
        return this.map.keys()
            .map((rawId) => idFromRaw(rawId));
    }

    clear(): void {
        this.map.clear();
    }

    delete(id: Id): boolean {
        return this.map.delete(idRaw(id));
    }

    forEach(
        callbackfn: (value: V, key: Id, map: Map<Id, V>) => void,
        thisArg?: unknown,
    ): void {
        this.map.forEach(
            (value, key, _map) => callbackfn(value, idFromRaw(key), this),
            thisArg,
        );
    }

    get size(): number {
        return this.map.size;
    }

    entries(): MapIterator<[Id, V]> {
        return this.map.entries()
            .map(([rawId, v]) => [idFromRaw(rawId), v]);
    }

    values(): MapIterator<V> {
        return this.map.values();
    }

    [Symbol.iterator](): MapIterator<[Id, V]> {
        return this.map[Symbol.iterator]()
            .map(([rawId, v]) => [idFromRaw(rawId), v]);
    }

    get [Symbol.toStringTag](): string {
        return this.map[Symbol.toStringTag];
    }
}
