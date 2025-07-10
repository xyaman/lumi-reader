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

const STORE_RECORDS = "readerSources"
const STORE_LIGHT = "readerLightSources"
const STORE_SHELVES = "bookshelves"

interface LumiDbSchema extends DBSchema {
    [STORE_RECORDS]: {
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

export class LumiDb {
    private static dbPromise: Promise<IDBPDatabase<LumiDbSchema>>

    private static getDB(): Promise<IDBPDatabase<LumiDbSchema>> {
        if (!this.dbPromise) {
            this.dbPromise = openDB<LumiDbSchema>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_RECORDS)) {
                        db.createObjectStore(STORE_RECORDS, {
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

    static async saveBookRecord(source: ReaderSourceRecord): Promise<void> {
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
        const tx = db.transaction([STORE_RECORDS, STORE_LIGHT], "readwrite")

        let localId = source.localId
        // Add new entry, let IndexedDB generate the key
        if (!localId) {
            // Check for duplicate by uniqueId
            if (existing) {
                return
            }

            localId = await tx.objectStore(STORE_RECORDS).put(source)
            lightRecord.localId = localId
            await tx.objectStore(STORE_LIGHT).put(lightRecord as ReaderSourceLightRecord)

            // update the source object with the new id
            source.localId = localId
        } else {
            await Promise.all([
                tx.objectStore(STORE_RECORDS).put(source),
                tx.objectStore(STORE_LIGHT).put(lightRecord as ReaderSourceLightRecord),
            ])
        }
        await tx.done
    }

    static async deleteBookById(localId: number): Promise<void> {
        const db = await this.getDB()
        const tx = db.transaction([STORE_RECORDS, STORE_LIGHT], "readwrite")
        await Promise.all([
            tx.objectStore(STORE_RECORDS).delete(localId),
            tx.objectStore(STORE_LIGHT).delete(localId),
        ])
        await tx.done
    }

    static async getBookById(localId: number): Promise<ReaderSourceRecord | undefined> {
        const db = await this.getDB()
        return db.get(STORE_RECORDS, localId)
    }

    static async getLightBookById(localId: number): Promise<ReaderSourceLightRecord | undefined> {
        const db = await this.getDB()
        return db.get(STORE_LIGHT, localId)
    }

    static async getAllLightBooks(): Promise<ReaderSourceLightRecord[]> {
        const db = await this.getDB()
        return db.getAll(STORE_LIGHT)
    }

    // Bookshelf CRUD methods
    static async createBookShelf(name: string): Promise<Bookshelf> {
        const db = await this.getDB()
        const shelf: Omit<Bookshelf, "id"> = { name, bookIds: [] }
        const id = await db.add(STORE_SHELVES, shelf as Bookshelf)
        return { ...shelf, id }
    }

    static async getShelfById(id: number): Promise<Bookshelf | undefined> {
        const db = await this.getDB()
        return db.get(STORE_SHELVES, id)
    }

    static async getAllBookshelves(): Promise<Bookshelf[]> {
        const db = await this.getDB()
        return db.getAll(STORE_SHELVES)
    }

    static async updateBookshelf(shelf: Bookshelf): Promise<void> {
        const db = await this.getDB()
        await db.put(STORE_SHELVES, shelf)
    }

    static async deleteBookshelfById(id: number): Promise<void> {
        const db = await this.getDB()
        await db.delete(STORE_SHELVES, id)
    }

    static async addBookToShelf(shelfId: number, bookId: number): Promise<void> {
        const shelf = await this.getShelfById(shelfId)
        if (!shelf) return
        if (!shelf.bookIds.includes(bookId)) {
            shelf.bookIds.push(bookId)
            await this.updateBookshelf(shelf)
        }
    }

    static async removeBookFromShelf(shelfId: number, bookId: number): Promise<void> {
        const shelf = await this.getShelfById(shelfId)
        if (!shelf) return
        shelf.bookIds = shelf.bookIds.filter((id) => id !== bookId)
        await this.updateBookshelf(shelf)
    }
}
