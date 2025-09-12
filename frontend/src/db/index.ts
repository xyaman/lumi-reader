import readingSessions from "./readingSessions.ts"

import Dexie, { Table } from "dexie"
import type { SourceImage, NavigationItem, Section } from "@/lib/readerSource"

import { ApiUserBook } from "@/api/userBooks"
import { ApiReadingSession } from "@/types/api.ts"

export type ReaderSourceLightRecord = ApiUserBook & {
    localId: number
    coverImage?: SourceImage
}

export type ReaderSourceData = {
    sections: Section[]
    nav: NavigationItem[]
    images: SourceImage[]
    css: string
}

export type ReaderSourceRecord = Omit<ReaderSourceLightRecord, "coverImage"> & ReaderSourceData

export type Bookshelf = {
    id: number
    name: string
    bookIds: number[]
}

export type LocalReadingSession = Omit<ApiReadingSession, "createdAt" | "updatedAt"> & {
    synced: number
    createdAt: Date
    updatedAt: Date
}

const DB_NAME = "BookReaderDB"
const DB_VERSION = 3

export class LumiDbClass extends Dexie {
    readerSources!: Table<ReaderSourceRecord, number>
    readerLightSources!: Table<ReaderSourceLightRecord, number>
    bookshelves!: Table<Bookshelf, number>
    readingSessions!: Table<LocalReadingSession, number>

    constructor() {
        super(DB_NAME)

        this.version(DB_VERSION).stores({
            readerSources: "++localId,&uniqueId",
            readerLightSources: "++localId,&uniqueId",
            bookshelves: "++id",
            readingSessions: "snowflake,bookId,synced,createdAt,updatedAt",
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
            bookmarks: source.bookmarks,
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
}

export const LumiDb = new LumiDbClass()
export default {
    readingSessions,
}
