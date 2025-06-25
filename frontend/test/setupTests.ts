import {
    indexedDB,
    IDBKeyRange,
    IDBDatabase,
    IDBTransaction,
    IDBRequest,
    IDBCursor,
    IDBObjectStore,
    IDBIndex,
} from "fake-indexeddb"

// Assign missing globals for idb library
Object.assign(globalThis, {
    indexedDB,
    IDBKeyRange,

    IDBDatabase,
    IDBTransaction,
    IDBRequest,

    IDBCursor,
    IDBObjectStore,
    IDBIndex,
})
