import api from "@/lib/api"
import { LumiDb, ReadingSession } from "@/lib/db"
import { ISessionStatus, sessionStore } from "@/stores/session"
import { createSignal } from "solid-js"

interface IPartialSource {
    localId: number
    uniqueId: string
    title: string
    language: string
    currChars: number
}

const LS_SYNCTIME = "last_session_sync_time"

export default class ReadingSessionManager {
    activeSession: () => ReadingSession | null
    setActiveSession: (session: ReadingSession | undefined) => void
    lastSyncTime: number

    constructor() {
        ;[this.activeSession, this.setActiveSession] = createSignal<ReadingSession | null>(null)
        this.lastSyncTime = Number(localStorage.getItem(LS_SYNCTIME) || "0")
    }

    async isSyncNeeded() {
        if (sessionStore.status === ISessionStatus.unauthenticated) return false
        try {
            const metadata = await api.getReadingSessionMetadata()
            return metadata.lastUpdate > this.lastSyncTime
        } catch (e) {
            console.error("error:", e)
        }
    }

    async syncWithBackend() {
        try {
            if (await this.isSyncNeeded()) {
                const sessions = await api.getReadingSessionsSince(this.lastSyncTime)

                for (const s of sessions) {
                    const localSession = await LumiDb.getReadingSessionById(s.snowflake)
                    if (!localSession) {
                        await LumiDb.createReadingSessionFromCloud(s)
                    } else {
                        if (s.updatedAt! > localSession.updatedAt!) {
                            await LumiDb.updateReadingSession(s)
                        }
                    }
                }

                // TODO: upload local changes that havent been uploaded
                // Update last sync time
                this.lastSyncTime = Math.floor(Date.now() / 1000)
                localStorage.setItem("last_session_sync_time", String(this.lastSyncTime))

                return true
            }
        } catch (e) {
            console.error("failed syncing with the backend", e)
            return false
        }

        return false
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
