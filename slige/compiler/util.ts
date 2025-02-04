export function todo<T>(...args: unknown[]): T {
    const argsStr = args.map((a) => JSON.stringify(a)).join(", ");
    class NotImplemented extends Error {
        constructor() {
            super(`todo(${argsStr})`);
            this.name = "NotImplemented";
        }
    }
    throw new NotImplemented();
}

export function exhausted<T>(...args: never[]): T {
    const argsStr = args.map((a) => JSON.stringify(a)).join(", ");
    class Unexhausted extends Error {
        constructor() {
            super(`exhausted(${argsStr})`);
            this.name = "Unexhausted";
        }
    }
    throw new Unexhausted();
}

export type Res<V, E> = Ok<V> | Err<E>;
export type Ok<V> = { ok: true; val: V };
export type Err<E> = { ok: false; val: E };

export const Ok = <V>(val: V): Ok<V> => ({ ok: true, val });
export const Err = <E>(val: E): Err<E> => ({ ok: false, val });

export const Res = { Ok, Err } as const;

export type ControlFlow<
    R = undefined,
    V = undefined,
> = Break<R> | Continue<V>;

export type Break<R> = { break: true; val: R };
export type Continue<V> = { break: false; val: V };

export const ControlFlow = {
    Break: <R>(val: R): Break<R> => ({ break: true, val }),
    Continue: <V>(val: V): Continue<V> => ({ break: false, val }),
} as const;

export const range = (length: number) => (new Array(length).fill(0));

export const strictEq = <T>(a: T, b: T): boolean => a === b;

export function arrayEq<T>(
    a: T[],
    b: T[],
    elemCmp: (a: T, b: T) => boolean = strictEq,
): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; ++i) {
        if (!elemCmp(a[i], b[i])) {
            return false;
        }
    }
    return true;
}
