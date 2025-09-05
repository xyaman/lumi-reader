import db from "@/db"
import { formatTime } from "@/lib/utils"
import { createEffect, createResource, createSignal, Match, Show, Switch } from "solid-js"
import { IconArrowPath, IconError, IconTick } from "@/components/icons"

import ReadingSessionManager from "@/services/readingSession"
import Checkbox from "@/ui/checkbox"
import { useAuthState } from "@/context/auth"
import { ReadingSessionsList, Calendar } from "@/components/home/readingSessions"

export function ReadingSessions() {
    const authState = useAuthState()
    const [isSyncing, setIsSyncing] = createSignal(false)
    const [syncError, setSyncError] = createSignal<string | null>(null)

    const syncSessions = async () => {
        if (!authState.user) return
        setIsSyncing(true)
        setSyncError(null)

        const res = await ReadingSessionManager.getInstance().syncEvents()
        if (res.error) {
            console.error(res.error)
            setSyncError(res.error.message)
        } else {
            await refetchLocalSessions()
        }
        setIsSyncing(false)
    }

    // update sessions with the backend
    createEffect(() => syncSessions())

    const totalReadingTime = () =>
        sessions()
            ?.map((s) => s.timeSpent)
            .reduce((b, a) => b + a)

    const totalBooks = () => {
        const allSessions = sessions() || []
        const uniqueBooks = new Set(allSessions.map((s) => s.bookTitle))
        return uniqueBooks.size
    }

    const longestReadingSession = () => {
        const times = sessions()?.map((s) => s.timeSpent)
        if (!times) return "-"
        const max = Math.max(...times)
        if (!isFinite(max) || isNaN(max)) return "-"
        return formatTime(max)
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(now)
    lastWeekStart.setDate(now.getDate() - 6)
    lastWeekStart.setHours(0, 0, 0, 0)

    const [groupByBook, setGroupByBook] = createSignal(true)
    const [dateRange, setDateRange] = createSignal<{ from: Date | null; to: Date | null }>({
        from: todayStart,
        to: now,
    })
    const [showCalendar, setShowCalendar] = createSignal(false)
    const [selectedOpt, setSelectedOpt] = createSignal<"today" | "this week" | "range">("today")

    const [sessions, { refetch: refetchLocalSessions }] = createResource(dateRange, async () => {
        const range = dateRange()
        if (range.from === null) return []
        if (range.to === null) return []
        return await db.readingSessions.index({ from: range.from, to: range.to })
    })

    return (
        <>
            <header class="mb-8">
                <h1 class="text-3xl font-bold">Reading sessions</h1>
                <p>Manage your reading progress</p>
            </header>
            <div class="px-4 mx-auto">
                <div class="flex flex-wrap items-center justify-between mb-8">
                    {/* buttons */}
                    <div class="flex items-center space-x-2">
                        <button
                            class="cursor-pointer bg-base01 rounded p-2"
                            classList={{ "bg-base02": selectedOpt() === "today" }}
                            onClick={() => {
                                setSelectedOpt("today")
                                setDateRange({ from: todayStart, to: now })
                                setShowCalendar(false)
                            }}
                        >
                            Today
                        </button>
                        <button
                            class="cursor-pointer bg-base01 rounded p-2"
                            classList={{ "bg-base02": selectedOpt() === "this week" }}
                            onClick={() => {
                                setDateRange({ from: lastWeekStart, to: now })
                                setSelectedOpt("this week")
                                setShowCalendar(false)
                            }}
                        >
                            Last week
                        </button>
                        <button
                            class="cursor-pointer bg-base01 rounded p-2"
                            classList={{ "bg-base02": selectedOpt() === "range" }}
                            onClick={() => {
                                setSelectedOpt("range")
                                setShowCalendar(true)
                            }}
                        >
                            Range
                        </button>
                    </div>

                    {/* group toggle and status */}
                    <div class="flex items-center space-x-2 mt-8 md:mt-0">
                        <span>Group by book</span>
                        <Checkbox checked={groupByBook()} onChange={() => setGroupByBook((p) => !p)} />
                        <div
                            class="flex items-center space-x-2 px-3 py-2 bg-base01 rounded-full border-2"
                            classList={{
                                "border-base08": syncError() !== null,
                                "border-base0D": syncError() === null,
                            }}
                        >
                            <Switch
                                fallback={
                                    <>
                                        <IconTick />
                                        <span>Synced</span>
                                    </>
                                }
                            >
                                <Match when={isSyncing()}>
                                    <IconArrowPath rotation />
                                    <span>Syncing</span>
                                </Match>
                                <Match when={syncError()}>
                                    <IconError class="text-base08" />
                                    <span>Error</span>
                                </Match>
                            </Switch>
                        </div>
                    </div>
                </div>
                <Show when={showCalendar()}>
                    <div class="w-min">
                        <Calendar mode="range" onValueChange={(e) => setDateRange(e)}>
                            {/* TODO */}
                            {() => null}
                        </Calendar>
                    </div>
                </Show>
                <div class="mb-2 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="bg-base01 p-6 rounded border border-base02">
                        <h3 class="text-lg font-medium mb-2">Total Reading Time</h3>
                        <p class="text-2xl font-bold">{totalReadingTime()}</p>
                    </div>
                    <div class="bg-base01 p-6 rounded border border-base02">
                        <h3 class="text-lg font-medium mb-2">Total Books</h3>
                        <p class="text-2xl font-bold">{totalBooks()} books</p>
                    </div>
                    <div class="bg-base01 p-6 rounded border border-base02">
                        <h3 class="text-lg font-medium mb-2">Longest Session</h3>
                        <p class="text-2xl font-bold">{longestReadingSession()}</p>
                    </div>
                </div>
                {/* content */}
                <ReadingSessionsList sessions={sessions() || []} groupByBook={groupByBook()} />
            </div>
        </>
    )
}
