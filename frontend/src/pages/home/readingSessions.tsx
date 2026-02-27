import db, { LocalReadingSession, LumiDb } from "@/db"
import { createResource, createSignal } from "solid-js"
import { SessionsToolbar, StatCard, ReadingSessionsList, StatsCards } from "@/components/home/readingSessions"
import { readingSessionsApi } from "@/api/readingSessions"
import { ok } from "@/lib/result"
import { lsAuth } from "@/services/localStorage"

async function syncEvents() {
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

export function ReadingSessions() {
    const [groupByBook, setGroupByBook] = createSignal(true)
    const [_sortBy, setSortBy] = createSignal("")

    // dates
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const [dateRange, setDateRange] = createSignal({ from: todayStart, to: now })

    const [sessionStats, setSessionStats] = createSignal([] as StatCard[])

    // every time session are fetched, update the session stats too
    const [localSessions, { mutate, refetch }] = createResource(dateRange, async (range) => {
        const { to, from } = range
        const sessions = (await db.readingSessions.index({ from, to })).filter((s) => s.status !== "removed")
        if (sessions.length === 0) return []

        setSessionStats([
            {
                label: "Total Reading Time",
                value: `${(sessions.map((s) => s.timeSpent).reduce((b, a) => a + b) / 3600).toFixed(2)} hours`,
            },
            { label: "Total Books", value: 0 },
            {
                label: "Longest session",
                value: `${(Math.max(...sessions.map((s) => s.timeSpent)) / 3600).toFixed(2)} hours`,
            },
        ])
        return sessions
    })

    // -- handlers
    // note: if this function throws, the SessionsToolbar component
    // will display the error.
    const handleSync = async () => {
        // -- download from the server
        const downloadRes = await readingSessionsApi.sync({ autoManage: true })
        if (downloadRes.error) throw downloadRes.error

        const deletedSessions = downloadRes.ok.data.filter((s) => s.status === "removed").map((s) => s.snowflake)
        const newSessions = downloadRes.ok.data
            .filter((s) => s.status === "active")
            .map((s) => ({
                ...s,
                updatedAt: new Date(s.updatedAt),
                createdAt: new Date(s.createdAt),
                synced: 1,
            }))

        await LumiDb.readingSessions.bulkAdd(newSessions)
        await LumiDb.readingSessions.bulkDelete(deletedSessions)
        await refetch()

        // -- upload local sessions
        const uploadRes = await syncEvents()
        if (uploadRes.error) throw uploadRes.error
    }

    const onDelete = async (session: LocalReadingSession) => {
        if (confirm("Are you sure you want to remove this session? It will also be removed from the cloud.")) {
            await db.readingSessions.delete(session.snowflake)
            const res = await syncEvents()
            if (res.error) console.error(res.error)
            mutate((prev) => prev && prev?.filter((s) => s.snowflake != session.snowflake))
        }
    }

    return (
        <>
            <header class="mb-8">
                <h1 class="text-3xl font-bold">Reading sessions</h1>
                <p>Track your reading progress and insights</p>
            </header>
            <main>
                <SessionsToolbar
                    groupByBook={groupByBook()}
                    setGroupByBook={setGroupByBook}
                    setSortBy={setSortBy}
                    dateRange={dateRange()}
                    onDateRangeSelect={(from: Date, to: Date) => setDateRange({ from, to })}
                    onSync={handleSync}
                />
                <StatsCards stats={sessionStats()} />
                <ReadingSessionsList sessions={localSessions() || []} groupByBook={groupByBook()} onDelete={onDelete} />
            </main>
        </>
    )
}
