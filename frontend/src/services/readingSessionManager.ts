import api from "@/lib/api"
import { LumiDb, ReadingSession } from "@/lib/db"
import { createSignal } from "solid-js"

interface IPartialSource {
    localId: number
    uniqueId: string
    title: string
    language: string
    currChars: number
}

export default class ReadingSessionManager {
    activeSession: () => ReadingSession | null
    setActiveSession: (session: ReadingSession | undefined) => void

    constructor() {
        ;[this.activeSession, this.setActiveSession] = createSignal<ReadingSession | null>(null)
    }

    async startSession(source: IPartialSource) {
        if (this.activeSession()) return
        const session = await LumiDb.createReadingSession(source)
        this.setActiveSession(session)
        api.createReadingSession(session)
    }

    async finishSession(): Promise<void> {
        const session = this.activeSession()
        if (!session) return
        // remove the session from the database if characters count is 0
        // or if updateTime is undefined
        if (session.currChars === session.initialChars) {
            await LumiDb.deleteReadingSession(session.snowflake)
            await api.deleteReadingSession(session.snowflake)
            return
        }

        if (!session.isPaused) {
            await this.pauseSession()
        }

        const now = Math.floor(Date.now() / 1000)
        const updatedSession = { ...session, endTime: now }
        this.setActiveSession(updatedSession)
        await LumiDb.updateReadingSession(updatedSession)
        this.setActiveSession(undefined)
    }

    async pauseSession() {
        const session = this.activeSession()
        if (!session) return

        const now = Math.floor(Date.now() / 1000)
        const updatedSession = {
            ...session,
            lastActiveTime: now,
            isPaused: true,
        }
        this.setActiveSession(updatedSession)
        await LumiDb.updateReadingSession(updatedSession)
    }

    async resumeSession() {
        const session = this.activeSession()
        if (!session) return

        const now = Math.floor(Date.now() / 1000)
        const updatedSession = {
            ...session,
            lastActiveTime: now,
            isPaused: false,
        }

        this.setActiveSession(updatedSession)
        await LumiDb.updateReadingSession(updatedSession)
    }

    async updateReadingProgress(charsPosition: number) {
        const session = this.activeSession()
        if (!session || session.isPaused) return

        const now = Math.floor(Date.now() / 1000)
        const updatedSession = {
            ...session,
            totalReadingTime: session.totalReadingTime + (now - session.lastActiveTime),
            currChars: charsPosition,
            lastActiveTime: now,
        }

        this.setActiveSession(updatedSession)
        await LumiDb.updateReadingSession(updatedSession)
        await api.updateReadingSession(session.snowflake, session)
    }
}
