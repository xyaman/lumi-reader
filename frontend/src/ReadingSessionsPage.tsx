import { LumiDb, ReadingSession } from "@/lib/db"
import { formatTime } from "@/lib/utils"
import { createResource, createSignal, For, Match, onMount, Show, Switch } from "solid-js"
import {
    IconArrowPath,
    IconCalendar,
    IconClock,
    IconError,
    IconLanguage,
    IconTick,
    IconTrendingUp,
} from "./components/icons"
import Calendar from "./components/Calendar"

import { useAuthContext } from "@/context/session"
import ReadingSessionManager from "./services/readingSession"

export function ReadingSessionsPage() {
    const { sessionStore } = useAuthContext()
    const [isSyncing, setIsSyncing] = createSignal(false)
    const [syncError, setSyncError] = createSignal<string | null>(null)

    const syncSessions = async () => {
        if (!sessionStore.user) return
        setIsSyncing(true)
        setSyncError(null)
        const didChange = await ReadingSessionManager.syncWithBackend()
        if (didChange.error) {
            console.error(didChange.error)
            setSyncError(didChange.error.message)
        } else if (didChange.ok) {
            await refetch()
        }

        setIsSyncing(false)
    }

    // update sessions with the backend
    onMount(() => syncSessions())

    const totalReadingTime = () =>
        formatTime(sessions()?.reduce((a, b) => a + b.totalReadingTime, 0) || 0)

    const totalBooks = () => {
        const allSessions = sessions() || []
        const uniqueBooks = new Set(allSessions.map((s) => s.bookTitle))
        return uniqueBooks.size
    }

    const longestReadingSession = () => {
        const times = sessions()?.map((s) => s.totalReadingTime)
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

    const [sessions, { refetch }] = createResource(dateRange, async () => {
        const range = dateRange()
        // TODO: Should i return something if its null? what is best UX?
        if (range.from === null) return []
        if (range.to === null) return []

        const start = Math.floor(range.from.getTime() / 1000)
        const end = Math.floor(range.to.getTime() / 1000)

        return await LumiDb.getReadingSessionByDateRange(start, end)
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
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                class="sr-only peer"
                                checked={groupByBook()}
                                onChange={() => setGroupByBook((p) => !p)}
                            />
                            <div class="w-11 h-6 bg-base04 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-base0D"></div>
                        </label>
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

type GroupSession = ReadingSession & {
    internals?: ReadingSession[]
}

export function ReadingSessionsList(props: { sessions: ReadingSession[]; groupByBook?: boolean }) {
    const internalSessions = () => {
        if (!props.groupByBook) return props.sessions
        let groupSessions: Record<string, GroupSession> = {}
        props.sessions.forEach((s) => {
            if (groupSessions[s.bookTitle]) {
                groupSessions[s.bookTitle].totalReadingTime += s.totalReadingTime
                groupSessions[s.bookTitle].internals!.push(s)
            } else {
                groupSessions[s.bookTitle] = { ...s, internals: [s] }
            }
        })
        return Object.values(groupSessions)
    }

    return (
        <div>
            <h2 class="text-xl font-semibold mb-4">
                {props.groupByBook ? "Books" : "All Sessions"}
            </h2>
            <div class="grid grid-cols-1 gap-6">
                <For each={internalSessions()}>
                    {(session) =>
                        props.groupByBook ? (
                            <GroupCard group={session} />
                        ) : (
                            <IndividualSessions session={session} />
                        )
                    }
                </For>
            </div>
        </div>
    )
}

function GroupCard(props: { group: GroupSession }) {
    const [showNested, setShowNested] = createSignal(false)

    const totalChars = () => props.group.currChars - props.group.initialChars
    const readingSpeed = () => {
        const time = props.group.totalReadingTime
        if (totalChars() === 0 || time === 0) return 0
        return Math.ceil((totalChars() * 3600) / time)
    }
    return (
        <>
            <div
                class="cursor-pointer bg-base01 hover:bg-base02 rounded border border-base02 p-6 overflow-hidden"
                onClick={() => setShowNested((p) => !p)}
            >
                <div class="flex justify-between">
                    <div class="max-w-[70%]">
                        <h3 class="text-xl font-bold truncate">{props.group.bookTitle}</h3>
                        <div class="flex items-center space-x-4 mt-2">
                            <div class="flex items-center space-x-4 mt-2">
                                <span class="text-sm text-base04 flex items-center">
                                    <IconLanguage class="mr-1" />
                                    {props.group.bookLanguage}
                                </span>
                                <span class="text-sm text-base04 flex items-center">
                                    <IconClock class="mr-1" />
                                    {formatTime(props.group.totalReadingTime)}
                                </span>
                                <span class="text-sm text-base04 flex items-center">
                                    <IconCalendar class="mr-1" />
                                    {props.group.internals?.length || 1}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-2 md:mt-0">
                        <div class="flex space-x-2">
                            <span class="bg-base03 px-2 py-1 rounded text-sm">
                                {totalChars()} chars
                            </span>
                            <span class="bg-base03 px-2 py-1 rounded text-sm">
                                {readingSpeed()} cph
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <Show when={showNested()}>
                <div class=" pl-4 md:pl-8 border-l-2 border-base02">
                    <For each={props.group.internals}>
                        {(session) => (
                            <IndividualSessions grouped={showNested()} session={session} />
                        )}
                    </For>
                </div>
            </Show>
        </>
    )
}

function IndividualSessions(props: { grouped?: boolean; session: ReadingSession }) {
    const dateFromTimestamp = (unixtimestamp: number) => {
        const date = new Date(unixtimestamp * 1000)
        const month = date.toLocaleString("en-US", { month: "short" })
        const day = date.getDate().toString().padStart(2, "0")
        const hours = date.getHours().toString().padStart(2, "0")
        const minutes = date.getMinutes().toString().padStart(2, "0")
        return `${month} ${day} ${hours}:${minutes}`
    }

    const totalChars = () => props.session.currChars - props.session.initialChars
    const readingSpeed = () => {
        const time = props.session.totalReadingTime
        if (totalChars() === 0 || time === 0) return 0
        return Math.ceil((totalChars() * 3600) / time)
    }

    return (
        <div class="bg-base01 rounded border border-base02 p-4 overflow-hidden mb-2">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    {!props.grouped && (
                        <h2 class="mb-2 text-sm truncate">{props.session.bookTitle}</h2>
                    )}
                    <h3>Session on {dateFromTimestamp(props.session.startTime)}</h3>
                    <div class="flex items-center space-x-4 mt-1">
                        <span class="text-sm text-base04 flex items-center">
                            <IconClock class="mr-1" />
                            {formatTime(props.session.totalReadingTime)}
                        </span>
                        <span class="text-sm text-base04 flex items-center">
                            <IconTick class="mr-1" />
                            {props.session.currChars - props.session.initialChars} chars
                        </span>
                        <span class="text-sm text-base04 flex items-center">
                            <IconTrendingUp class="mr-1" />
                            {readingSpeed()} cph
                        </span>
                    </div>
                </div>
                <div class="mt-2 md:mt-0 flex space-x-2">
                    <button class="cursor-pointer px-3 py-1 bg-base03 rounded-md text-sm font-medium">
                        Edit
                    </button>
                    <button class="cursor-pointer px-3 py-1 bg-base03 hover:bg-base08 rounded-md text-sm font-medium">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
