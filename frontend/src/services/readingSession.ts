import { LumiDb, ReadingSession } from "@/lib/db"
import { createSignal } from "solid-js"
import { lsReadingSessions } from "./localStorage"
import { readingSessionsApi } from "@/api/readingSessions"
import { AsyncResult, err, ok } from "@/lib/result"

interface IPartialSource {
    localId: number
    uniqueId: string
    title: string
    language: string
    currChars: number
}

export default class ReadingSessionManager {
    private static sharedInstance: ReadingSessionManager | null = null
    activeSession: () => ReadingSession | null
    setActiveSession: (session: ReadingSession | null) => void

    private constructor() {
        ;[this.activeSession, this.setActiveSession] = createSignal<ReadingSession | null>(null)
    }

    static getInstance(): ReadingSessionManager {
        if (!ReadingSessionManager.sharedInstance) {
            ReadingSessionManager.sharedInstance = new ReadingSessionManager()
        }
        return ReadingSessionManager.sharedInstance
    }

    static async syncWithBackend(): AsyncResult<boolean, Error> {
        if (!navigator.onLine) {
            return err(new Error("offline"))
        }

        // 1. get local changes since last sync
        const now = Math.floor(Date.now() / 1000)
        const lastSyncTime = lsReadingSessions.lastSyncTime()
        const localIds = await LumiDb.getAllReadingSessionIds()

        // 2. get remote diffs
        const diffRes = await readingSessionsApi.diff(lastSyncTime, localIds)
        if (diffRes.error) {
            return diffRes
        }

        // 3.1 Update local sessions
        const remoteOnlySessions = diffRes.ok.data!.remoteOnlySessions
        if (remoteOnlySessions.length === 0) {
            return ok(false)
        }

        for (const rs of remoteOnlySessions) {
            await LumiDb.createReadingSessionFromCloud(rs)
        }

        // 3.  Handle different types of changes
        if (localIds.length > 0) {
            const localOnlySessions = await Promise.all(localIds.map((id) => LumiDb.getReadingSessionById(id)))
            const updateRes = await readingSessionsApi.batchUpdate(localOnlySessions.filter((s) => s !== undefined))
            if (updateRes.error) {
                return updateRes
            }
            console.log(updateRes.ok.data)
        }

        // 3.2 Conflicts (ignore for now)
        // TODO

        // 3.3 Updated (Nothing to do?)
        // 3.4 Created (Nothing to do?)
        lsReadingSessions.setLastSyncTime(diffRes.ok.data!.syncTimestamp)
        return ok(true)
    }

    async startSession(source: IPartialSource) {
        if (this.activeSession()) return
        const session = await LumiDb.createReadingSession(source)
        this.setActiveSession(session)
        await readingSessionsApi.create(session)
    }

    async finishSession(): Promise<void> {
        const session = this.activeSession()
        if (!session) return
        // remove the session from the database if characters count is 0
        // or if updateTime is undefined
        if (session.currChars === session.initialChars) {
            await LumiDb.deleteReadingSession(session.snowflake)
            await readingSessionsApi.delete(session.snowflake)
            return
        }

        if (!session.isPaused) {
            await this.pauseSession()
        }

        const now = Math.floor(Date.now() / 1000)
        const updatedSession = { ...session, endTime: now }
        this.setActiveSession(updatedSession)

        await LumiDb.updateReadingSession(updatedSession)
        await readingSessionsApi.update(updatedSession.snowflake, updatedSession)
        this.setActiveSession(null)
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
        if (syncBackend) await readingSessionsApi.update(session.snowflake, session)
    }
}
