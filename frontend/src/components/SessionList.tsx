import { LumiDb, ReadingSession } from "@/lib/db"
import { formatTime } from "@/lib/utils"
import { createResource, createSignal, For, onMount, Show } from "solid-js"
import { IconEdit, IconTrash } from "./icons"
import Calendar from "./Calendar"
import ReadingSessionManager from "@/services/readingSessionManager"

export function ReadingSessionsPage() {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(now)
    lastWeekStart.setDate(now.getDate() - 6)
    lastWeekStart.setHours(0, 0, 0, 0)

    const [dateRange, setDateRange] = createSignal<{ from: Date | null; to: Date | null }>({
        from: todayStart,
        to: now,
    })
    const [showCalendar, setShowCalendar] = createSignal(false)

    return (
        <>
            <header class="mb-8">
                <h1 class="text-3xl font-bold">Reading sessions</h1>
                <p>Manage your reading progress</p>
            </header>
            <div class="px-4 mx-auto">
                <div class="flex space-x-2 mb-4">
                    <button
                        class="cursor-pointer bg-base01 rounded p-2"
                        classList={{
                            "bg-base02":
                                dateRange().from?.getTime() === todayStart.getTime() &&
                                dateRange().to?.getTime() === now.getTime() &&
                                !showCalendar(),
                        }}
                        onClick={() => {
                            setDateRange({ from: todayStart, to: now })
                            setShowCalendar(false)
                        }}
                    >
                        Today
                    </button>
                    <button
                        class="cursor-pointer bg-base01 rounded p-2"
                        classList={{
                            "bg-base02":
                                dateRange().from?.getTime() === lastWeekStart.getTime() &&
                                dateRange().to?.getTime() === now.getTime() &&
                                !showCalendar(),
                        }}
                        onClick={() => {
                            setDateRange({ from: lastWeekStart, to: now })
                            setShowCalendar(false)
                        }}
                    >
                        Last week
                    </button>
                    <button
                        class="cursor-pointer bg-base01 rounded p-2"
                        classList={{ "bg-base02": showCalendar() }}
                        onClick={() => setShowCalendar(true)}
                    >
                        Range
                    </button>
                </div>
                <Show when={showCalendar()}>
                    <div class="w-min">
                        <Calendar mode="range" onValueChange={(e) => setDateRange(e)}>
                            {/* TODO */}
                            {() => null}
                        </Calendar>
                    </div>
                </Show>
                {/* content */}
                <ReadingSessionsList range={dateRange} />
            </div>
        </>
    )
}

export function ReadingSessionsList(props: {
    range: () => { from: Date | null; to: Date | null }
}) {
    const [sessions, { mutate, refetch }] = createResource(props.range, async () => {
        const range = props.range()
        // TODO: Should i return something if its null? what is best UX?
        if (range.from === null) return []
        if (range.to === null) return []

        const start = Math.floor(range.from.getTime() / 1000)
        const end = Math.floor(range.to.getTime() / 1000)
        return await LumiDb.getReadingSessionByDateRange(start, end)
    })

    // update sessions with the backend
    onMount(async () => {
        const manager = new ReadingSessionManager()
        if (await manager.syncWithBackend()) {
            await refetch()
        }
    })

    const deleteSession = async (id: number) => {
        if (confirm("Are you sure you want to delete this session?")) {
            await LumiDb.deleteReadingSession(id)
            mutate((prev) => prev && prev.filter((s) => s.snowflake !== id))
        }
    }

    return (
        <div class="grid grid-cols-1 gap-6">
            <For each={sessions() || []}>
                {(session) => (
                    <div class="navbar-theme rounded-lg border">
                        <ReadingSessionCard session={session} deleteSession={deleteSession} />
                    </div>
                )}
            </For>
        </div>
    )
}

function ReadingSessionCard(props: {
    session: ReadingSession
    deleteSession?: (id: number) => Promise<void>
}) {
    const formatDate = (timestamp?: number | null) => {
        if (!timestamp) return "In progress"
        const date = new Date(timestamp * 1000)
        return (
            date.toLocaleDateString() +
            " " +
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        )
    }

    return (
        <div class="p-6">
            <div class="flex flex-row justify-between mb-2">
                <p class="text-lg font-semibold truncate">{props.session.bookTitle}</p>
                <p class="text-xs">{props.session.bookLanguage}</p>
            </div>
            <div class="md:w-[50%] grid grid-cols-2 gap-2 my-4 items-start text-sm">
                <div>
                    <p class="text-(--base04)">Start time</p>
                    <p>{formatDate(props.session.startTime)}</p>
                </div>
                <div>
                    <p class="text-(--base04)">End Time</p>
                    <p>{formatDate(props.session.endTime)}</p>
                </div>
            </div>
            <div class="flex justify-between items-center">
                <div class="text-sm">
                    <p class="text-(--base04)">Reading Time</p>
                    <p>{formatTime(props.session.totalReadingTime)}</p>
                </div>
                <div class="flex gap-2">
                    <button class="button-alt">
                        <IconEdit />
                    </button>
                    <button
                        class="button-alt"
                        onClick={() => props.deleteSession?.(props.session.snowflake)}
                    >
                        <IconTrash />
                    </button>
                </div>
            </div>
        </div>
    )
}
