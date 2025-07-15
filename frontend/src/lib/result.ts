export type Ok<T> = {
    ok: T
    error: null
}

export type Err<E> = {
    ok: null
    error: E
}

export type Result<T, E> = Ok<T> | Err<E>
export type AsyncResult<T, E> = Promise<Result<T, E>>

export function ok<T>(t: T) {
    return { ok: t, error: null }
}

export function err<E>(e: E) {
    return { ok: null, error: e }
}
