import Dexie, { Table } from "dexie"
import type { Bookmark, SourceImage, NavigationItem, Section } from "@/lib/readerSource"

import { ApiUserBook } from "@/api/userBooks"

export type ReaderSourceLightRecord = ApiUserBook & {
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
    bookIds: number[]
}

export type ReadingSession = {
    snowflake: number
    userId?: number | null
    bookId: string
    bookTitle: string
    bookLanguage: string
    startTime: Date
    endTime?: Date | null
    initialChars: number
    currChars: number
    totalReadingTime: number
    updatedAt?: Date | null
    lastActiveTime: Date
    isPaused: boolean
}

const DB_NAME = "BookReaderDB"
const DB_VERSION = 1

export class LumiDbClass extends Dexie {
    readerSources!: Table<ReaderSourceRecord, number>
    readerLightSources!: Table<ReaderSourceLightRecord, number>
    bookshelves!: Table<Bookshelf, number>
    readingSessions!: Table<ReadingSession, number>

    constructor() {
        super(DB_NAME)

        this.version(DB_VERSION).stores({
            readerSources: "++localId,&uniqueId",
            readerLightSources: "++localId,&uniqueId",

            bookshelves: "++id",

            readingSessions: "snowflake, bookId",
        })
    }

    // ---------- BOOKS ----------
    async saveBookRecord(source: ReaderSourceRecord, updateAt = true): Promise<void> {
        if (updateAt) source.updatedAt = new Date().toISOString()

        const lightRecord: Partial<ReaderSourceLightRecord> = {
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
        }
        if (source.localId) lightRecord.localId = source.localId

        const existing = await this.readerLightSources.get({ uniqueId: source.uniqueId })

        await this.transaction("rw", this.readerSources, this.readerLightSources, async () => {
            let localId = source.localId
            if (!localId) {
                if (existing) return
                localId = await this.readerSources.add(source)
                lightRecord.localId = localId
                await this.readerLightSources.add(lightRecord as ReaderSourceLightRecord)
                source.localId = localId
            } else {
                await Promise.all([
                    this.readerSources.put(source),
                    this.readerLightSources.put(lightRecord as ReaderSourceLightRecord),
                ])
            }
        })
    }

    async deleteBookById(localId: number) {
        await this.transaction("rw", this.readerSources, this.readerLightSources, async () => {
            await this.readerSources.delete(localId)
            await this.readerLightSources.delete(localId)
        })
    }

    getBookById(localId: number) {
        return this.readerSources.get(localId)
    }

    getBookByUniqueId(uniqueId: string) {
        return this.readerSources.get({ uniqueId })
    }

    getLightBookById(localId: number) {
        return this.readerLightSources.get(localId)
    }

    getAllLightBooks() {
        return this.readerLightSources.toArray()
    }

    // ---------- BOOKSHELVES ----------
    async createBookShelf(name: string): Promise<Bookshelf> {
        const shelf: Omit<Bookshelf, "id"> = { name, bookIds: [] }
        const id = await this.bookshelves.add(shelf as Bookshelf)
        return { ...shelf, id }
    }

    getShelfById(id: number) {
        return this.bookshelves.get(id)
    }

    getAllBookshelves() {
        return this.bookshelves.toArray()
    }

    updateBookshelf(shelf: Bookshelf) {
        return this.bookshelves.put(shelf)
    }

    deleteBookshelfById(id: number) {
        return this.bookshelves.delete(id)
    }

    async addBookToShelf(shelfId: number, bookId: number) {
        const shelf = await this.getShelfById(shelfId)
        if (!shelf) return
        if (!shelf.bookIds.includes(bookId)) {
            shelf.bookIds.push(bookId)

            await this.updateBookshelf(shelf)
        }
    }

    async removeBookFromShelf(shelfId: number, bookId: number) {
        const shelf = await this.getShelfById(shelfId)

        if (!shelf) return
        shelf.bookIds = shelf.bookIds.filter((id) => id !== bookId)
        await this.updateBookshelf(shelf)
    }

    // ---------- READING SESSIONS ----------
    async createReadingSession(book: {
        localId: number
        uniqueId: string
        title: string
        language: string
        currChars: number
    }): Promise<ReadingSession> {
        const snowflake = Math.floor(Date.now() / 1000)

        const now = new Date()
        const session: ReadingSession = {
            snowflake,
            bookId: book.uniqueId,
            bookTitle: book.title,
            bookLanguage: book.language,
            startTime: now,
            totalReadingTime: 0,
            lastActiveTime: now,
            isPaused: false,
            initialChars: book.currChars,
            currChars: book.currChars,
            updatedAt: now,
        }
        await this.readingSessions.add(session)
        return session
    }

    createReadingSessionFromCloud(session: Partial<ReadingSession>) {
        return this.readingSessions.put(session as ReadingSession)
    }

    getAllReadingSessions() {
        return this.readingSessions.toArray()
    }

    getReadingSessionById(id: number) {
        return this.readingSessions.get(id)
    }

    getAllReadingSessionIds() {
        return this.readingSessions.toCollection().primaryKeys() as Promise<number[]>
    }

    async getReadingSessionByDateRange(start: Date, end: Date, limit = 20, offset = 0) {
        const sessions = await this.readingSessions
            .filter((s) => s.startTime >= new Date(start) && s.startTime <= new Date(end))
            .toArray()

        sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        return sessions.slice(offset, offset + limit)
    }

    async updateReadingSession(newSession: Partial<ReadingSession>) {
        if (!newSession.snowflake) throw new Error("Undefined id/snowflake")

        const curr = await this.getReadingSessionById(newSession.snowflake)
        if (!curr) return

        const updated = { ...curr, ...newSession, updatedAt: new Date() }
        await this.readingSessions.put(updated)
    }

    async getRecentReadingSessions(page: number) {
        const results = await this.readingSessions
            .orderBy("snowflake")
            .reverse()
            .offset(page * 6)
            .limit(6)
            .toArray()
        return results
    }

    deleteReadingSession(id: number) {
        return this.readingSessions.delete(id)
    }
}

export const LumiDb = new LumiDbClass()
