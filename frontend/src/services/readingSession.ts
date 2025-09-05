import { readingSessionsApi } from "@/api/readingSessions"
import db from "@/db"
import { ok } from "@/lib/result"
import { createSignal } from "solid-js"
import { lsAuth } from "./localStorage"

interface IBookSource {
    localId: number
    uniqueId: string
    title: string
    language: string
    currChars: number
}

export default class ReadingSessionManager {
    private static instance: ReadingSessionManager | null = null

    isPaused: () => boolean
    private setIsPaused: (b: boolean) => void
    sessionSnowflake: () => number | null
    private setSessionSnowflake: (s: number | null) => void

    sessionStartTime: () => Date | null
    private setSessionStartTime: (d: Date | null) => void

    readingTime: () => number
    private setReadingTime: (t: number) => void

    lastActiveTime: () => Date | null
    private setLastActiveTime: (d: Date | null) => void

    currentBook: () => IBookSource | null
    private setCurrentBook: (b: IBookSource | null) => void
    initialCharsPosition: () => number
    private setInitialCharsPosition: (n: number) => void

    static getInstance() {
        if (!this.instance) {
            this.instance = new ReadingSessionManager()
        }
        return this.instance
    }

    constructor() {
        ;[this.isPaused, this.setIsPaused] = createSignal(false)
        ;[this.sessionSnowflake, this.setSessionSnowflake] = createSignal(null)
        ;[this.currentBook, this.setCurrentBook] = createSignal<IBookSource | null>(null)
        ;[this.readingTime, this.setReadingTime] = createSignal<number>(0)
        ;[this.sessionStartTime, this.setSessionStartTime] = createSignal<Date | null>(null)
        ;[this.lastActiveTime, this.setLastActiveTime] = createSignal<Date | null>(null)
        ;[this.initialCharsPosition, this.setInitialCharsPosition] = createSignal(0)
    }

    isReading() {
        return this.currentBook() != null
    }

    async startReading(book: IBookSource) {
        // Auto-finish previous session
        if (this.isReading()) {
            await this.endReading()
        }

        const now = new Date()
        this.setCurrentBook(book)
        this.setSessionStartTime(now)
        this.setLastActiveTime(now)
        this.setInitialCharsPosition(book.currChars)

        const event = {
            userId: undefined,
            bookId: book.uniqueId,
            bookTitle: book.title,
            bookLanguage: book.language,
            charsRead: 0,
            timeSpent: 0,
            synced: 0,
        }

        const snowflake = await db.readingSessions.create(event)
        this.setSessionSnowflake(snowflake)
    }

    async resume() {
        if (!this.isPaused()) return

        this.setIsPaused(false)
        this.setLastActiveTime(new Date())
    }

    async pause() {
        if (this.isPaused()) return

        // If we're not paused and are in a session, update the time first.
        if (!this.isPaused() && this.isReading()) {
            const now = new Date()
            const lastTime = this.lastActiveTime()!
            const timeSpent = this.readingTime() + Math.floor((now.getTime() - lastTime.getTime()) / 1000)
            this.setReadingTime(timeSpent)
        }

        this.setIsPaused(true)
        this.setLastActiveTime(new Date())
    }

    async updateProgress(charsPosition: number) {
        if (!this.isReading() || !this.currentBook() || !this.sessionSnowflake()) return
        if (this.isPaused()) return

        console.log("updating progress:", charsPosition)

        const now = new Date()
        const lastTime = this.lastActiveTime()!
        const charsRead = charsPosition - this.initialCharsPosition()
        const timeSpent = this.readingTime() + Math.floor((now.getTime() - lastTime.getTime()) / 1000)
        this.setReadingTime(timeSpent)

        await db.readingSessions.updateProgress(this.sessionSnowflake()!, {
            charsRead,
            timeSpent,
        })
        console.log("written")
        this.setLastActiveTime(now)
    }

    async endReading() {
        if (!this.isReading() || !this.currentBook()) return
        // const snowflake = this.sessionSnowflake()!

        // less than 30 seconds, remove the session
        if (this.readingTime() < 30) {
            db.readingSessions.delete(this.sessionSnowflake()!)
        }

        this.setCurrentBook(null)
        this.setSessionSnowflake(null)
        this.setSessionStartTime(null)
        this.setLastActiveTime(null)
        this.setReadingTime(0)

        // try to sync if online
        if (navigator.onLine) {
            await this.syncEvents()
            // await db.readingSessions.updateSyncedBatch([snowflake], true)
        }
    }

    async syncEvents() {
        const unsyncedSessions = await db.readingSessions.index({ synced: false })
        console.log("session", unsyncedSessions)
        if (unsyncedSessions.length === 0) return ok(null)

        const user = lsAuth.currentUser()
        if (!user) return ok(null)

        const apiSessions = unsyncedSessions.map((s) => ({
            ...s,
            userId: user.id,
            updatedAt: s.updatedAt.toISOString(),
            createdAt: s.createdAt.toISOString(),
        }))

        const response = await readingSessionsApi.create(apiSessions)
        if (response.error) return response

        const result = response.ok.data
        const syncedSessions = result.filter((s) => s.status === "created").map((s) => s.snowflake)
        await db.readingSessions.updateSyncedBatch(syncedSessions, true)
        return ok(null)
    }
}
