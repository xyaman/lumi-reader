import db, { LocalReadingSession, LumiDb } from "@/db"
import { createResource, createSignal } from "solid-js"
import { FilterBar, StatCard, ReadingSessionsList, SyncStatus, StatsCards } from "@/components/home/readingSessions"

export function ReadingSessions() {
    const [groupByBook, setGroupByBook] = createSignal(true)
    const [_sortBy, setSortBy] = createSignal("")
    const [dateRange, setDateRange] = createSignal({ from: new Date(), to: new Date() })

    const [sessionStats, setSessionStats] = createSignal([] as StatCard[])

    const [localSessions, { mutate }] = createResource(async () => {
        const sessions = await db.readingSessions.index()

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
    const handleSync = async () => {}

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
                <FilterBar
                    groupByBook={groupByBook()}
                    setGroupByBook={setGroupByBook}
                    setSortBy={setSortBy}
                    dateRange={dateRange()}
                    onDateRangeSelect={(from: Date, to: Date) => setDateRange({ from, to })}
                />
                <SyncStatus isSyncing={false} error={undefined} handleSync={handleSync} />
                <StatsCards stats={sessionStats()} />
                <ReadingSessionsList sessions={localSessions() || []} groupByBook={groupByBook()} onDelete={onDelete} />
            </main>
        </>
    )
}
