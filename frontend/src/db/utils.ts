import { liveQuery } from "dexie"
import { onCleanup, onMount } from "solid-js"
import { createStore, reconcile, ReconcileOptions } from "solid-js/store"

// https://dexie.org/docs/liveQuery%28%29#deep-dive
// https://docs.solidjs.com/reference/store-utilities/reconcile
export function useLiveQuery<T>(query: () => T[] | Promise<T[]>, options?: ReconcileOptions): T[] {
    const [store, setStore] = createStore<T[]>([])

    onMount(() => {
        const observable = liveQuery(query)
        const subscription = observable.subscribe({
            next: (result) => setStore(reconcile(result, options)),
        })
        onCleanup(() => {
            subscription.unsubscribe()
        })
    })

    return store
}
