import { openDB, DBSchema, IDBPDatabase } from "idb"
import type { Bookmark, SourceImage, NavigationItem, Section } from "./readerSource"

export type ReaderSourceLightRecord = {
    kind: "epub"
    localId: number
    uniqueId: string
    title: string
    creator: string[]
    language: string
    coverImage?: SourceImage
    lastModifiedDate: number
    creationDate: number
    totalChars: number
    currChars: number
    currParagraph: number
}

export type ReaderSourceRecord = Omit<ReaderSourceLightRecord, "coverImage"> & {
    sections: Section[]
    nav: NavigationItem[]
    bookmarks: Bookmark[]
    images: SourceImage[]
    css: string
}

export type Bookshelf = {
    id: number
    name: string
    // localIds of ReaderSourceLightRecord
    bookIds: number[]
}

const DB_NAME = "BookReaderDB"
const DB_VERSION = 1

const STORE_FULL = "readerSources"
const STORE_LIGHT = "readerLightSources"
const STORE_SHELVES = "bookshelves"

interface ReaderDBSchema extends DBSchema {
    [STORE_FULL]: {
        key: number
        value: ReaderSourceRecord
    }

    [STORE_LIGHT]: {
        key: number
        value: ReaderSourceLightRecord
        indexes: {
            uniqueId: string
        }
    }

    [STORE_SHELVES]: {
        key: number
        value: Bookshelf
    }
}

export class ReaderSourceDB {
    private static dbPromise: Promise<IDBPDatabase<ReaderDBSchema>>

    private static getDB(): Promise<IDBPDatabase<ReaderDBSchema>> {
        if (!this.dbPromise) {
            this.dbPromise = openDB<ReaderDBSchema>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_FULL)) {
                        db.createObjectStore(STORE_FULL, {
                            keyPath: "localId",
                            autoIncrement: true,
                        })
                    }

                    if (!db.objectStoreNames.contains(STORE_LIGHT)) {
                        const store = db.createObjectStore(STORE_LIGHT, {
                            keyPath: "localId",
                            autoIncrement: true,
                        })
                        store.createIndex("uniqueId", "uniqueId", { unique: true })
                    }

                    if (!db.objectStoreNames.contains(STORE_SHELVES)) {
                        db.createObjectStore(STORE_SHELVES, {
                            keyPath: "id",
                            autoIncrement: true,
                        })
                    }
                },
            })
        }
        return this.dbPromise
    }

    static async save(source: ReaderSourceRecord): Promise<void> {
        const db = await this.getDB()
        source.lastModifiedDate = Date.now()

        // Prepare lightRecord, omitting localId if not present
        const lightRecord = {
            kind: source.kind,
            title: source.title,
            uniqueId: source.uniqueId,
            creator: source.creator,
            coverImage: source.images[0],
            lastModifiedDate: source.lastModifiedDate,
            creationDate: source.creationDate,
            totalChars: source.totalChars,
            currChars: source.currChars,
            currParagraph: source.currParagraph,
        } as Partial<ReaderSourceLightRecord>
        if (source.localId) lightRecord.localId = source.localId

        const existing = await db.getFromIndex(STORE_LIGHT, "uniqueId", source.uniqueId)
        const tx = db.transaction([STORE_FULL, STORE_LIGHT], "readwrite")

        let localId = source.localId
        // Add new entry, let IndexedDB generate the key
        if (!localId) {
            // Check for duplicate by uniqueId
            if (existing) {
                return
            }

            localId = await tx.objectStore(STORE_FULL).put(source)
            lightRecord.localId = localId
            await tx.objectStore(STORE_LIGHT).put(lightRecord as ReaderSourceLightRecord)

            // update the source object with the new id
            source.localId = localId
        } else {
            await Promise.all([
                tx.objectStore(STORE_FULL).put(source),
                tx.objectStore(STORE_LIGHT).put(lightRecord as ReaderSourceLightRecord),
            ])
        }
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

    // Bookshelf CRUD methods
    static async createShelf(name: string): Promise<Bookshelf> {
        const db = await this.getDB()
        const shelf: Omit<Bookshelf, "id"> = { name, bookIds: [] }
        const id = await db.add(STORE_SHELVES, shelf as Bookshelf)
        return { ...shelf, id }
    }

    static async getShelf(id: number): Promise<Bookshelf | undefined> {
        const db = await this.getDB()
        return db.get(STORE_SHELVES, id)
    }

    static async listShelves(): Promise<Bookshelf[]> {
        const db = await this.getDB()
        return db.getAll(STORE_SHELVES)
    }

    static async updateShelf(shelf: Bookshelf): Promise<void> {
        const db = await this.getDB()
        await db.put(STORE_SHELVES, shelf)
    }

    static async deleteShelf(id: number): Promise<void> {
        const db = await this.getDB()
        await db.delete(STORE_SHELVES, id)
    }

    static async addBookToShelf(shelfId: number, bookId: number): Promise<void> {
        const shelf = await this.getShelf(shelfId)
        if (!shelf) return
        if (!shelf.bookIds.includes(bookId)) {
            shelf.bookIds.push(bookId)
            await this.updateShelf(shelf)
        }
    }

    static async removeBookFromShelf(shelfId: number, bookId: number): Promise<void> {
        const shelf = await this.getShelf(shelfId)
        if (!shelf) return
        shelf.bookIds = shelf.bookIds.filter((id) => id !== bookId)
        await this.updateShelf(shelf)
    }
}
