import { createContext, useContext, JSX, onCleanup, onMount } from "solid-js"
import { createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { ok } from "@/lib/result"
import db from "@/db"
import { lsReadingSessions } from "@/services/localStorage"
import { readingSessionsApi } from "@/api/readingSessions"
import { lsAuth } from "@/services/localStorage"
import { infoToast } from "@/ui"

interface IBookSource {
    localId: number
    uniqueId: string
    title: string
    language: string
    currChars: number
}

type ReadingSessionState = {
    isActive: boolean
    isPaused: boolean
    readingTime: number
    charsRead: number
    currentBook: IBookSource | null
    sessionSnowflake: number | null
}

type ReadingSessionDispatch = {
    startSession: (book: IBookSource) => Promise<void>
    pauseSession: () => Promise<void>
    resumeSession: () => Promise<void>
    endSession: () => Promise<void>
    updateProgress: (charsPosition: number) => Promise<void>
}

const ReadingSessionStateContext = createContext<ReadingSessionState>()
const ReadingSessionDispatchContext = createContext<ReadingSessionDispatch>()

export function ReadingSessionProvider(props: { children: JSX.Element; book?: IBookSource }) {
    const [store, setStore] = createStore<ReadingSessionState>({
        isActive: false,
        isPaused: false,
        readingTime: 0,
        charsRead: 0,
        currentBook: null,
        sessionSnowflake: null,
    })

    const [initialCharsPosition, setInitialCharsPosition] = createSignal(0)
    const [lastActiveTime, setLastActiveTime] = createSignal<Date | null>(null)

    let debounceTimer: number | null = null
    let pendingProgress: { charsRead: number; timeSpent: number } | null = null

    const flushPendingProgress = async () => {
        if (!pendingProgress || !store.sessionSnowflake) return

        await db.readingSessions.updateProgress(store.sessionSnowflake, pendingProgress)
        pendingProgress = null
    }

    const debouncedUpdateProgress = (charsRead: number, timeSpent: number) => {
        pendingProgress = { charsRead, timeSpent }

        if (debounceTimer) clearTimeout(debounceTimer)

        debounceTimer = window.setTimeout(() => {
            flushPendingProgress()
        }, 5000)
    }

    const calculateElapsedTime = () => {
        const lastTime = lastActiveTime()
        if (!lastTime) return 0
        return Math.floor((Date.now() - lastTime.getTime()) / 1000)
    }

    const startSession = async (book: IBookSource) => {
        if (store.isActive) {
            await endSession()
        }

        const now = new Date()
        setStore("currentBook", book)
        setStore("isActive", true)
        setStore("isPaused", false)
        setStore("readingTime", 0)
        setStore("charsRead", 0)
        setLastActiveTime(now)
        setInitialCharsPosition(book.currChars)

        const event = {
            userId: undefined,
            bookId: book.uniqueId,
            bookTitle: book.title,
            bookLanguage: book.language,
            charsRead: 0,
            timeSpent: 0,
            synced: 0,
            status: "active" as const,
        }

        const snowflake = await db.readingSessions.create(event)
        setStore("sessionSnowflake", snowflake)
        const title = book.title.length > 30 ? book.title.slice(0, 30) + "..." : book.title
        infoToast(`Reading session started: ${title}`)
    }

    const pauseSession = async () => {
        if (store.isPaused || !store.isActive) return

        const now = new Date()
        const elapsed = calculateElapsedTime()
        setStore("readingTime", store.readingTime + elapsed)

        if (pendingProgress) {
            await flushPendingProgress()
        }

        setStore("isPaused", true)
        setLastActiveTime(now)
    }

    const resumeSession = async () => {
        if (!store.isPaused) return

        setStore("isPaused", false)
        setLastActiveTime(new Date())
    }

    const endSession = async () => {
        if (!store.isActive || !store.currentBook) return

        if (debounceTimer) {
            clearTimeout(debounceTimer)
            await flushPendingProgress()
        }

        const finalTime = store.readingTime + (store.isPaused ? 0 : calculateElapsedTime())

        if (finalTime < 30) {
            infoToast("Session discarded (less than 30 seconds)")
            db.readingSessions.delete(store.sessionSnowflake!)
        }

        setStore("isActive", false)
        setStore("isPaused", false)
        setStore("currentBook", null)
        setStore("sessionSnowflake", null)
        setStore("readingTime", 0)
        setStore("charsRead", 0)
        setLastActiveTime(null)

        if (navigator.onLine) {
            await syncEvents()
        }
    }

    const updateProgress = async (charsPosition: number) => {
        if (!store.isActive || !store.currentBook || !store.sessionSnowflake) return
        if (store.isPaused) return

        const elapsed = calculateElapsedTime()
        const totalTime = store.readingTime + elapsed
        const chars = charsPosition - initialCharsPosition()

        setStore("readingTime", totalTime)
        setStore("charsRead", chars)
        setLastActiveTime(new Date())

        debouncedUpdateProgress(chars, totalTime)
    }

    const syncEvents = async () => {
        const user = lsAuth.currentUser()
        if (!user) return ok(null)

        const unsyncedSessions = await db.readingSessions.index({ synced: false })
        if (unsyncedSessions.length === 0) return ok(null)

        const newSessions = unsyncedSessions.filter((s) => s.status === "active")
        const deletedSessions = unsyncedSessions.filter((s) => s.status === "removed")

        if (deletedSessions.length > 0) {
            const deletedRes = await Promise.all(deletedSessions.map((s) => readingSessionsApi.destroy(s.snowflake)))
            const deletedResError = deletedRes.find((s) => s.error !== null)
            if (deletedResError) return deletedResError
            const success = deletedRes.filter((res) => res.error === null).map((res) => res.ok.data)
            await db.readingSessions.updateSyncedBatch(success, true)
        }

        const apiSessions = newSessions.map((s) => ({
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

    const getElapsedSeconds = () => {
        if (!store.isActive) return 0
        if (store.isPaused) return store.readingTime
        return store.readingTime + calculateElapsedTime()
    }

    const getSessionTime = () => getElapsedSeconds()

    onMount(() => {
        if (lsReadingSessions.autoStart() && props.book) {
            startSession(props.book)
        }
    })

    onCleanup(() => {
        if (debounceTimer) clearTimeout(debounceTimer)
        if (store.isActive) {
            endSession()
        }
    })

    const stateValue: ReadingSessionState = {
        get isActive() { return store.isActive },
        get isPaused() { return store.isPaused },
        get readingTime() { return getSessionTime() },
        get charsRead() { return store.charsRead },
        get currentBook() { return store.currentBook },
        get sessionSnowflake() { return store.sessionSnowflake },
    }

    const dispatchValue: ReadingSessionDispatch = {
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        updateProgress,
    }

    return (
        <ReadingSessionStateContext.Provider value={stateValue}>
            <ReadingSessionDispatchContext.Provider value={dispatchValue}>
                {props.children}
            </ReadingSessionDispatchContext.Provider>
        </ReadingSessionStateContext.Provider>
    )
}

export function useReadingSessionState() {
    const ctx = useContext(ReadingSessionStateContext)
    if (!ctx) {
        throw new Error("useReadingSessionState must be used within ReadingSessionProvider")
    }
    return ctx
}

export function useReadingSessionDispatch() {
    const ctx = useContext(ReadingSessionDispatchContext)
    if (!ctx) {
        throw new Error("useReadingSessionDispatch must be used within ReadingSessionProvider")
    }
    return ctx
}
