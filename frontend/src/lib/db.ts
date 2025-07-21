import { openDB, DBSchema, IDBPDatabase } from "idb"
import type { Bookmark, SourceImage, NavigationItem, Section } from "./readerSource"
import { SyncedBook } from "@/api/syncedBooks"

export type ReaderSourceLightRecord = SyncedBook & {
    localId: number
    coverImage?: SourceImage
}

export type ReaderSourceData = {
    sections: Section[]
    nav: NavigationItem[]
    bookmarks: Bookmark[]
    images: SourceImage[]
    css: string
}

export type ReaderSourceRecord = Omit<ReaderSourceLightRecord, "coverImage"> & ReaderSourceData

export type Bookshelf = {
    id: number
    name: string
    // localIds of ReaderSourceLightRecord
    bookIds: number[]
}

export type ReadingSession = {
    snowflake: number // unique session id (snowflake/timestamp)
    userId?: number | null // null or undefined for local users

    bookLocalId?: number // reference to ReaderSourceLightRecord or similar
    bookId: string // reference to the real source (ex. epub identifier)
    bookTitle: string
    bookLanguage: string

    startTime: number // unix timestamp
    endTime?: number | null // unix timestamp

    totalReadingTime: number // accumulated seconds of active reading
    lastActiveTime: number // unix timestamp of last activity
    isPaused: boolean

    initialChars: number
    currChars: number
    sessionsCount: number // number of pause/resume

    updatedAt?: number | null
}

const DB_NAME = "BookReaderDB"
const DB_VERSION = 1

const STORE_RECORDS = "readerSources"
const STORE_LIGHT = "readerLightSources"
const STORE_SHELVES = "bookshelves"
const STORE_READING_SESSIONS = "readingSessions"

interface LumiDbSchema extends DBSchema {
    [STORE_RECORDS]: {
        key: number
        value: ReaderSourceRecord
        indexes: {
            uniqueId: string
        }
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

    [STORE_READING_SESSIONS]: {
        key: number
        value: ReadingSession
        indexes: {
            bookId: string
        }
    }
}

export class LumiDb {
    private static dbPromise: Promise<IDBPDatabase<LumiDbSchema>>

    private static getDB(): Promise<IDBPDatabase<LumiDbSchema>> {
        if (!this.dbPromise) {
            this.dbPromise = openDB<LumiDbSchema>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_RECORDS)) {
                        const store = db.createObjectStore(STORE_RECORDS, {
                            keyPath: "localId",
                            autoIncrement: true,
                        })
                        store.createIndex("uniqueId", "uniqueId", { unique: true })
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

                    if (!db.objectStoreNames.contains(STORE_READING_SESSIONS)) {
                        const store = db.createObjectStore(STORE_READING_SESSIONS, {
                            keyPath: "snowflake",
                        })
                        store.createIndex("bookId", "bookId", { unique: false })
                    }
                },
            })
        }
        return this.dbPromise
    }

    static async saveBookRecord(source: ReaderSourceRecord): Promise<void> {
        const db = await this.getDB()
        source.updatedAt = Math.floor(Date.now() / 1000)

        // Prepare lightRecord, omitting localId if not present
        const lightRecord = {
            kind: source.kind,
            title: source.title,
            uniqueId: source.uniqueId,
            language: source.language,
            creator: source.creator,
            coverImage: source.images[0],
            updatedAt: source.updatedAt,
            createdAt: source.createdAt,
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

    static async getBookByUniqueId(uniqueId: string): Promise<ReaderSourceRecord | undefined> {
        const db = await this.getDB()
        return db.getFromIndex(STORE_RECORDS, "uniqueId", uniqueId)
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

    // Reading Sesssion
    static async createReadingSession(book: {
        localId: number
        uniqueId: string
        title: string
        language: string
        currChars: number
    }): Promise<ReadingSession> {
        const db = await this.getDB()
        // Date.now returns miliseconds. We need unix timestamp
        const now = Math.floor(Date.now() / 1000)

        const session: ReadingSession = {
            snowflake: now,
            bookLocalId: book.localId,
            bookId: book.uniqueId,
            bookTitle: book.title,
            bookLanguage: book.language,
            startTime: now,
            totalReadingTime: 0,
            lastActiveTime: now,
            isPaused: false,
            initialChars: book.currChars,
            currChars: book.currChars,
            sessionsCount: 1,
            updatedAt: now,
        }

        await db.add(STORE_READING_SESSIONS, session)
        return session
    }

    // TODO: adjust the model because the backend and frontend data is slightly different
    static async createReadingSessionFromCloud(session: Partial<ReadingSession>): Promise<void> {
        const db = await this.getDB()
        await db.put(STORE_READING_SESSIONS, session as ReadingSession)
    }

    static async getAllReadingSessions(): Promise<ReadingSession[]> {
        const db = await this.getDB()
        return db.getAll(STORE_READING_SESSIONS)
    }

    static async getReadingSessionById(id: number): Promise<ReadingSession | undefined> {
        const db = await this.getDB()
        return db.get(STORE_READING_SESSIONS, id)
    }

    static async getAllReadingSessionIds(): Promise<number[]> {
        const db = await this.getDB()
        return await db.getAllKeys(STORE_READING_SESSIONS)
    }

    static async getReadingSessionByDateRange(start: number, end: number, limit = 20, offset = 0) {
        const db = await this.getDB()
        const range = IDBKeyRange.bound(start, end, false, false)

        // id is the same as startTime (so no need to use an index)
        const sessions = await db.getAll(STORE_READING_SESSIONS, range)

        // sort by startTime descending (newest first)
        sessions.sort((a, b) => b.startTime - a.startTime)

        return sessions.slice(offset, offset + limit)
    }

    // @throws if id is not passed
    static async updateReadingSession(newSession: Partial<ReadingSession>): Promise<void> {
        if (!newSession.snowflake)
            throw new Error("Undefined id/snowflake. Id must be a valid value")

        const db = await this.getDB()
        const currSession = await this.getReadingSessionById(newSession.snowflake)
        const updatedSession = { ...currSession }
        for (const key in newSession) {
            if (newSession[key as keyof ReadingSession])
                (updatedSession as any)[key] = newSession[key as keyof ReadingSession]
        }

        console.log("updating", updatedSession)

        updatedSession.updatedAt = Math.floor(Date.now() / 1000)
        await db.put(STORE_READING_SESSIONS, updatedSession as ReadingSession)
    }

    static async getRecentReadingSessions(page: number) {
        const db = await this.getDB()
        const tx = db.transaction(STORE_READING_SESSIONS, "readonly")
        const store = tx.objectStore(STORE_READING_SESSIONS)

        const results: ReadingSession[] = []
        let cursor = await store.openCursor(null, "prev")
        let skipped = 0
        const offset = page * 6 // page size is 20

        while (cursor && results.length < 6) {
            if (skipped < offset) {
                skipped++
            } else {
                results.push(cursor.value)
            }

            cursor = await cursor.continue()
        }

        await tx.done
        return results
    }

    static async deleteReadingSession(id: number): Promise<void> {
        const db = await this.getDB()
        return db.delete(STORE_READING_SESSIONS, id)
    }
}
