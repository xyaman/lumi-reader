import { LocalReadingSession, LumiDb } from "@/db"
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js"

export type ReadingSessionsListProps = {
    sessions: LocalReadingSession[]
    groupByBook: boolean
    onEdit?: (session: LocalReadingSession) => void
    onDelete?: (session: LocalReadingSession) => void
}

export function ReadingSessionsList(props: ReadingSessionsListProps) {
    const [coversUrl, setCoversUrl] = createSignal<Record<string, string>>({})

    const groupedSessions = () => {
        const map: Record<string, LocalReadingSession[]> = {}
        props.sessions.forEach((s) => {
            if (!map[s.bookTitle]) map[s.bookTitle] = []
            map[s.bookTitle].push(s)
        })
        return map
    }

    // Helpers
    const summarizeSessions = (sessions: LocalReadingSession[]) => {
        const totalTime = sessions.reduce((sum, s) => sum + s.timeSpent, 0)
        const totalChars = sessions.reduce((sum, s) => sum + s.charsRead, 0)
        return {
            totalTime: `${(totalTime / 3600).toFixed(2)} hours`,
            totalChars,
            count: sessions.length,
        }
    }

    // Load cover images once per book
    // TODO: this is wrong (onCleanup is not being called)
    createEffect(
        on(
            () => props.sessions,
            async () => {
                for (const s of props.sessions) {
                    if (!(s.bookId in coversUrl())) {
                        const lightbook = await LumiDb.readerLightSources.get({ uniqueId: s.bookId })

                        const url = lightbook?.coverImage?.blob
                            ? URL.createObjectURL(lightbook.coverImage.blob)
                            : "https://placehold.co/96x128?text=Book"

                        setCoversUrl((prev) => ({ ...prev, [s.bookId]: url }))
                    }
                }

                onCleanup(() => {
                    Object.values(coversUrl()).forEach((c) => URL.revokeObjectURL(c))
                    setCoversUrl({})
                })
            },
        ),
    )

    return (
        <div class="space-y-4">
            <Show
                when={props.groupByBook}
                fallback={
                    // Flat list (no grouping)
                    <For each={props.sessions}>
                        {(session) => (
                            <SessionCard
                                session={session}
                                onEdit={props.onEdit}
                                onDelete={props.onDelete}
                                coverUrl={coversUrl()[session.bookId]}
                                showImage
                            />
                        )}
                    </For>
                }
            >
                {/* Grouped List with summary + toggle details */}
                <For each={Object.entries(groupedSessions())}>
                    {([bookTitle, sessions]) => {
                        const summary = summarizeSessions(sessions)
                        const [expanded, setExpanded] = createSignal(false)

                        return (
                            <div class="rounded-lg shadow overflow-hidden">
                                {/* Summary card */}
                                <button
                                    class="bg-base01 w-full text-left px-4 py-3 flex justify-between items-center hover:bg-base02 transition"
                                    onClick={() => setExpanded(!expanded())}
                                >
                                    <div class="flex space-x-2 items-center">
                                        <img
                                            class="w-12 h-16 rounded object-cover"
                                            src={coversUrl()[sessions[0].bookId]}
                                            alt={bookTitle}
                                        />
                                        <div>
                                            <h3 class="text-md">{bookTitle}</h3>
                                            <p class="text-sm text-base04">{sessions[0].bookLanguage}</p>
                                        </div>
                                    </div>
                                    <div class="text-sm text-right">
                                        <p class="font-medium">{summary.totalTime}</p>
                                        <p>{summary.totalChars} chars</p>
                                        <p>{summary.count} sessions</p>
                                    </div>
                                </button>

                                <Show when={expanded()}>
                                    <div class="mt-2 pl-4 border-l-2 border-base02">
                                        <For each={sessions}>
                                            {(session) => (
                                                <SessionCard
                                                    session={session}
                                                    onEdit={props.onEdit}
                                                    onDelete={props.onDelete}
                                                />
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        )
                    }}
                </For>
            </Show>
        </div>
    )
}

function SessionCard(props: {
    session: LocalReadingSession
    onEdit?: (s: LocalReadingSession) => void
    onDelete?: (s: LocalReadingSession) => void
    showImage?: boolean
    coverUrl?: string
}) {
    // -- helpers
    const parseDate = (session: LocalReadingSession) => new Date(session.snowflake).toLocaleString()
    const parseTimeSpent = (session: LocalReadingSession) => `${(session.timeSpent / 3600).toFixed(2)} hours`

    return (
        <div class="bg-base01 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div class="flex space-x-2">
                <Show when={props.showImage}>
                    <img class="w-12 h-16 rounded object-cover" src={props.coverUrl} alt={props.session.bookTitle} />
                </Show>
                <div>
                    <h3 class="text-md">{props.session.bookTitle}</h3>
                    <p class="text-sm text-base04">Language: {props.session.bookLanguage}</p>
                </div>
            </div>
            <div>
                <p class="font-medium">{parseDate(props.session)}</p>
                <p class="text-sm">{parseTimeSpent(props.session)}</p>
                <p class="text-sm">{props.session.charsRead} chars</p>
            </div>
            <div class="flex gap-2">
                <button class="cursor-not-allowed text-base0D text-sm" onClick={() => props.onEdit?.(props.session)}>
                    Edit
                </button>
                <button class="cursor-pointer text-base08 text-sm" onClick={() => props.onDelete?.(props.session)}>
                    Delete
                </button>
            </div>
        </div>
    )
}
