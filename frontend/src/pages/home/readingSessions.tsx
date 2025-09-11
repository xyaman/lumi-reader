import db, { LocalReadingSession, LumiDb } from "@/db"
import { createResource, createSignal } from "solid-js"
import { SessionsToolbar, StatCard, ReadingSessionsList, StatsCards } from "@/components/home/readingSessions"
import { readingSessionsApi } from "@/api/readingSessions"
import ReadingSessionManager from "@/services/readingSession"

export function ReadingSessions() {
    const [groupByBook, setGroupByBook] = createSignal(true)
    const [_sortBy, setSortBy] = createSignal("")
    const [dateRange, setDateRange] = createSignal({ from: new Date(), to: new Date() })

    const [sessionStats, setSessionStats] = createSignal([] as StatCard[])

    // every time session are fetched, update the session stats too
    const [localSessions, { mutate, refetch }] = createResource(async () => {
        const sessions = await db.readingSessions.index()
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

        const newSessions = downloadRes.ok.data.map((s) => ({
            ...s,
            updatedAt: new Date(s.updatedAt),
            createdAt: new Date(s.createdAt),
            synced: 1,
        }))

        await LumiDb.readingSessions.bulkAdd(newSessions)
        await refetch()

        // -- upload local sessions
        const uploadRes = await ReadingSessionManager.getInstance().syncEvents()
        if (uploadRes.error) throw uploadRes.error
    }

    const onDelete = async (session: LocalReadingSession) => {
        if (confirm("Are you sure you want to remove this session? It wont be removed from the cloud.")) {
            await LumiDb.readingSessions.delete(session.snowflake)
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
