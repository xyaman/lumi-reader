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
    }

    async finishSession(): Promise<void> {
        const session = this.activeSession()
        if (!session) return
        // remove the session from the database if characters count is 0
        // or if updateTime is undefined
        if (session.currChars === session.initialChars) {
            return await LumiDb.deleteReadingSession(session.id)
        }

        if (!session.isPaused) {
            await this.pauseSession()
        }

        const now = Math.floor(Date.now() / 1000)
        session.endTime = now
        this.setActiveSession(session)
        await LumiDb.updateReadingSession(session)
    }

    async pauseSession() {
        const session = this.activeSession()
        if (!session) return

        const now = Math.floor(Date.now() / 1000)
        session.lastActiveTime = now

        session.isPaused = true
        this.setActiveSession(session)
        await LumiDb.updateReadingSession(session)
    }

    async resumeSession() {
        const session = this.activeSession()
        if (!session) return

        const now = Math.floor(Date.now() / 1000)
        session.lastActiveTime = now

        session.isPaused = false

        this.setActiveSession(session)
        await LumiDb.updateReadingSession(session)
    }

    async updateReadingProgress(charsPosition: number) {
        const session = this.activeSession()
        if (!session || session.isPaused) return

        const now = Math.floor(Date.now() / 1000)
        session.totalReadingTime += now - session.lastActiveTime!

        session.currChars = charsPosition
        session.lastActiveTime = now
        this.setActiveSession(session)
        await LumiDb.updateReadingSession(session)
    }
}
