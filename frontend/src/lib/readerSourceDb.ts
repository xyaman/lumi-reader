import { openDB, DBSchema, IDBPDatabase } from "idb"

export type ReaderSourceLightRecord = {
    localId: number
    uniqueId: string
    title: string
    creator: string[]
    coverUrl?: string

    sourceType: string
    lastModifiedDate: number
}

export type ReaderSourceRecord = ReaderSourceLightRecord & {
    creationDate: number
    language: string
    totalChars: number
    currChars: number
    currParagraph: number
    // ...other heavy fields...
}

const DB_NAME = "BookReaderDB"
const DB_VERSION = 1

const STORE_FULL = "readerSources"
const STORE_LIGHT = "readerLightSources"

interface ReaderDBSchema extends DBSchema {
    [STORE_FULL]: {
        key: number
        value: ReaderSourceRecord
    }

    [STORE_LIGHT]: {
        key: number
        value: ReaderSourceLightRecord
    }
}

export class ReaderSourceDB {
    private static dbPromise: Promise<IDBPDatabase<ReaderDBSchema>>

    private static getDB(): Promise<IDBPDatabase<ReaderDBSchema>> {
        if (!this.dbPromise) {
            this.dbPromise = openDB<ReaderDBSchema>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_FULL)) {
                        db.createObjectStore(STORE_FULL, { keyPath: "localId" })
                    }
                    if (!db.objectStoreNames.contains(STORE_LIGHT)) {
                        db.createObjectStore(STORE_LIGHT, { keyPath: "localId" })
                    }
                },
            })
        }
        return this.dbPromise
    }

    static async save(source: ReaderSourceRecord): Promise<void> {
        const db = await this.getDB()

        const lightRecord: ReaderSourceLightRecord = {
            localId: source.localId,
            uniqueId: source.uniqueId,

            title: source.title,
            creator: source.creator,
            coverUrl: source.coverUrl,

            sourceType: source.sourceType,

            lastModifiedDate: source.lastModifiedDate,
        }

        const tx = db.transaction([STORE_FULL, STORE_LIGHT], "readwrite")
        await Promise.all([
            tx.objectStore(STORE_FULL).put(source),
            tx.objectStore(STORE_LIGHT).put(lightRecord),
        ])
        await tx.done
    }

    static async deleteBook(localId: number): Promise<void> {
        const db = await this.getDB()
        const tx = db.transaction([STORE_FULL, STORE_LIGHT], "readwrite")
        await Promise.all([
            tx.objectStore(STORE_FULL).delete(localId),

            tx.objectStore(STORE_LIGHT).delete(localId),
        ])
        await tx.done
    }

    static async getBookById(localId: number): Promise<ReaderSourceRecord | undefined> {
        const db = await this.getDB()
        return db.get(STORE_FULL, localId)
    }

    static async getLightBookById(localId: number): Promise<ReaderSourceLightRecord | undefined> {
        const db = await this.getDB()
        return db.get(STORE_LIGHT, localId)
    }

    static async allLightBooks(): Promise<ReaderSourceLightRecord[]> {
        const db = await this.getDB()
        return db.getAll(STORE_LIGHT)
    }
}
