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

export class IdMap<Id extends IdBase, V> implements Map<Id, V> {
    private map = new Map<IdRaw<Id>, V>();

    set(id: Id, val: V) {
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
