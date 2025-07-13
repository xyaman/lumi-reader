import api from "@/lib/api"
import { LumiDb, ReadingSession } from "@/lib/db"
import { ISessionStatus, sessionStore } from "@/stores/session"
import { createSignal } from "solid-js"
import { lsReadingSessions } from "./localStorage"

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

    /**
     * Chacks if synchronization with the backend is needed by comparing the last update time.
     * @returns {Promise<boolean>} True if sync is needed, false otherwise.
     * @throws Will throw if there is a network error
     */
    static async isSyncNeeded(): Promise<boolean> {
        const lastSyncTime = lsReadingSessions.lastSyncTime()
        if (sessionStore.status === ISessionStatus.unauthenticated) return false

        const metadata = await api.getReadingSessionMetadata()
        return metadata.lastUpdate > lastSyncTime
    }

    /**
     * Synchronizes local reading sessions with the backend.
     * Downloads new/updated sessions and uploads local changes.
     * Updates the last sync time on success.
     * @returns {Promise<boolean>} True if sync occurred, false otherwise.
     * @throws Will throw if the API request fails or if there is a DB problem
     */
    static async syncWithBackendIfNeeded(): Promise<boolean> {
        try {
            if (await this.isSyncNeeded()) {
                let lastSyncTime = lsReadingSessions.lastSyncTime()
                const sessions = await api.getReadingSessionsSince(lastSyncTime)

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

                // Update last sync time
                const now = Math.floor(Date.now() / 1000)
                lsReadingSessions.setLastSyncTime(now)

                // TODO: upload local changes that havent been uploaded
                const localSessions = await LumiDb.getReadingSessionByDateRange(lastSyncTime, now)
                for (const ls of localSessions) {
                    // check if it exists in the backend
                    // update or create
                }

                return true
            }
        } catch (e) {
            console.error("failed syncing with the backend", e)
            throw e
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
        await api.updateReadingSession(updatedSession.snowflake, updatedSession)
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

    // called in reader context
    async updateReadingProgress(charsPosition: number, syncBackend: boolean = false) {
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
        if (syncBackend) await api.updateReadingSession(session.snowflake, session)
    }
}
