import { formatTime } from "@/lib/utils"
import { createSignal, For, Show } from "solid-js"
import { IconCalendar, IconClock, IconLanguage, IconTick, IconTrendingUp } from "@/components/icons"

import { ReadingSession } from "@/db"

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
            <h2 class="text-xl font-semibold mb-4">{props.groupByBook ? "Books" : "All Sessions"}</h2>
            <div class="grid grid-cols-1 gap-6">
                <For each={internalSessions()}>
                    {(session) =>
                        props.groupByBook ? <GroupCard group={session} /> : <IndividualSessions session={session} />
                    }
                </For>
            </div>
        </div>
    )
}

export function IndividualSessions(props: { grouped?: boolean; session: ReadingSession }) {
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
                    {!props.grouped && <h2 class="mb-2 text-sm truncate">{props.session.bookTitle}</h2>}
                    Session on {dateFromTimestamp(Math.floor(new Date(props.session.startTime).getTime() / 1000))}
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
                    <button class="cursor-pointer px-3 py-1 bg-base03 rounded-md text-sm font-medium">Edit</button>
                    <button class="cursor-pointer px-3 py-1 bg-base03 hover:bg-base08 rounded-md text-sm font-medium">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

export function GroupCard(props: { group: GroupSession }) {
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
                            <span class="bg-base03 px-2 py-1 rounded text-sm">{totalChars()} chars</span>
                            <span class="bg-base03 px-2 py-1 rounded text-sm">{readingSpeed()} cph</span>
                        </div>
                    </div>
                </div>
            </div>
            <Show when={showNested()}>
                <div class=" pl-4 md:pl-8 border-l-2 border-base02">
                    <For each={props.group.internals}>
                        {(session) => <IndividualSessions grouped={showNested()} session={session} />}
                    </For>
                </div>
            </Show>
        </>
    )
}
