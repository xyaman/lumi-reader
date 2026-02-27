import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import Sidebar from "@/components/Sidebar"
import ThemeList from "@/components/settings/Themelist"
import { ThemeProvider } from "@/context/theme"
import { Bookmark } from "@/lib/readerSource"
import { formatTime } from "@/lib/utils"
import { useReaderDispatch, useReaderState } from "@/context/reader"
import { useReadingSessionState, useReadingSessionDispatch } from "@/context/readingSession"
import { ReaderSettings } from "@/pages/settings"
import { Button } from "@/ui"

export function SettingsSidebar() {
    const readerState = useReaderState()
    const readerDispatch = useReaderDispatch()

    // Prevent scrolling on main view when is open
    createEffect(() => (document.body.style.overflow = readerState.sideBar !== null ? "hidden" : ""))

    return (
        <Sidebar
            side="right"
            overlay
            title="Settings"
            open={readerState.sideBar == "settings"}
            onClose={() => readerDispatch.setSidebar(null)}
        >
            <div class="space-y-4 pr-5 max-h-[90vh] overflow-y-auto">
                {/* TODO: only reload if changed pagination, vertical etc */}
                <ReaderSettings isEmbedded={true} />
                <ThemeProvider>
                    <ThemeList selectOnly />
                </ThemeProvider>
            </div>
        </Sidebar>
    )
}

export function ReaderLeftSidebar() {
    const readerState = useReaderState()
    const readerDispatch = useReaderDispatch()

    const titles = {
        toc: "Table of Contents",
        bookmarks: "Bookmarks",
        session: "Reading Session",
        settings: "",
        generic: "",
    }

    return (
        <Sidebar
            open={readerState.sideBar !== null && readerState.sideBar !== "settings"}
            side="left"
            title={titles[readerState.sideBar || "generic"]}
            overlay
            onClose={() => readerDispatch.setSidebar(null)}
        >
            <Show when={readerState.sideBar === "toc"}>
                <TocSidebarContent goTo={readerDispatch.navigationGoTo} />
            </Show>
            <Show when={readerState.sideBar === "bookmarks"}>
                <BookmarksSidebarContent onItemClick={readerDispatch.bookmarkGoTo} />
            </Show>
            <Show when={readerState.sideBar === "session"}>
                <ReadingSessionSidebar />
            </Show>
        </Sidebar>
    )
}

export function TocSidebarContent(props: { goTo: (file: string) => void }) {
    const readerState = useReaderState()

    return (
        <For each={readerState.book.nav}>
            {(item) => (
                <p
                    class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-[var(--base00)]"
                    onClick={() => {
                        if (item.file) props.goTo(item.file)
                    }}
                >
                    {item.text}
                </p>
            )}
        </For>
    )
}

export function BookmarksSidebarContent(props: { onItemClick: (b: Bookmark) => void }) {
    const readerState = useReaderState()
    const readerDispatch = useReaderDispatch()

    const [sortOption, setSortOption] = createSignal("added-newest")

    const sortedBookmarks = createMemo(() => {
        const bookmarks = [...readerState.book.bookmarks]
        switch (sortOption()) {
            case "added-oldest":
                return bookmarks
            case "paragraph-asc":
                return bookmarks.slice().sort((a, b) => a.paragraphId - b.paragraphId)
            case "paragraph-desc":
                return bookmarks.slice().sort((a, b) => b.paragraphId - a.paragraphId)
            case "added-newest":
            default:
                return bookmarks.slice().reverse()
        }
    })

    return (
        <div class="max-h-[90vh] overflow-y-auto">
            <div class="mb-2 flex items-center gap-2 row">
                <label for="bookmark-sort" class="text-xs text-(--base05)]">
                    Sort by:
                </label>
                <select
                    id="bookmark-sort"
                    class="text-xs px-2 py-1 rounded outline-none transition-colors bg-(--base01) text-(--base05) border border-(--base03) focus:border-(--base0D)"
                    value={sortOption()}
                    onInput={(e) => setSortOption(e.currentTarget.value)}
                >
                    <option value="added-newest" class="bg-(--base01) text-(--base05)">
                        Added (Newest)
                    </option>
                    <option value="added-oldest" class="bg-(--base01) text-(--base05)">
                        Added (Oldest)
                    </option>
                    <option value="paragraph-asc" class="bg-(--base01) text-(--base05)">
                        Paragraph (Ascending)
                    </option>
                    <option value="paragraph-desc" class="bg-(--base01) text-(--base05)">
                        Paragraph (Descending)
                    </option>
                </select>
            </div>
            <For each={sortedBookmarks()}>
                {(b, i) => (
                    <p
                        class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-[var(--base00)]"
                        onClick={() => {
                            readerDispatch.setSidebar(null)
                            props.onItemClick(b)
                        }}
                    >
                        {i() + 1}. <span innerHTML={b.content.trim()} />
                    </p>
                )}
            </For>
        </div>
    )
}

function ReadingSessionSidebar() {
    const readerState = useReaderState()
    const sessionState = useReadingSessionState()
    const sessionDispatch = useReadingSessionDispatch()

    const [tick, setTick] = createSignal(0)
    const [isEditingStartChar, setIsEditingStartChar] = createSignal(false)
    const [editStartCharValue, setEditStartCharValue] = createSignal(0)

    createEffect(() => {
        if (sessionState.isActive && !sessionState.isPaused) {
            const interval = setInterval(() => setTick((t) => t + 1), 1000)
            onCleanup(() => clearInterval(interval))
        }
    })

    const toggleSession = async () => {
        if (sessionState.isActive) {
            if (sessionState.isPaused) {
                await sessionDispatch.resumeSession()
            } else {
                await sessionDispatch.pauseSession()
            }
        } else {
            await sessionDispatch.startSession(readerState.book)
        }
    }

    const charactersRead = () => sessionState.charsRead

    const readingSpeed = () => {
        const elapsed = sessionState.readingTime
        const chars = charactersRead()
        if (chars === 0 || elapsed === 0) return "0 chars/h"
        return `${Math.ceil((chars * 3600) / elapsed)} chars/h`
    }

    const totalReadingTime = () => {
        tick()
        if (!sessionState.currentBook) return 0
        return sessionState.readingTime
    }

    const progress = () => {
        return Math.floor((readerState.currChars * 100) / readerState.book.totalChars)
    }

    const saveStartChar = () => {
        sessionDispatch.setInitialCharsPosition(editStartCharValue())
        setIsEditingStartChar(false)
    }

    const cancelEditStartChar = () => {
        setIsEditingStartChar(false)
    }

    const startEditStartChar = () => {
        setEditStartCharValue(sessionState.initialCharsPosition)
        setIsEditingStartChar(true)
    }

    return (
        <div class="max-h-[90vh] overflow-y-auto">
            <p class="text-md mb-2">
                Session: {sessionState.isPaused ? "Paused" : sessionState.isActive ? "Active" : "Inactive"}
            </p>

            <div class="space-y-4">
                <Button onClick={toggleSession}>
                    {sessionState.isActive ? (sessionState.isPaused ? "Resume" : "Pause") : "Start"}
                </Button>

                <Show when={sessionState.isActive}>
                    <div class="bg-base02 p-4 rounded">
                        <h3 class="text-sm font-medium mb-1">Reading Time</h3>
                        <p class="text-xl font-semibold">{formatTime(totalReadingTime())}</p>
                    </div>
                    <div class="bg-base02 p-4 rounded">
                        <h3 class="text-sm font-medium mb-1">Characters Read</h3>
                        <p class="text-xl font-semibold">{charactersRead()}</p>
                    </div>
                    <div class="bg-base02 p-4 rounded">
                        <h3 class="text-sm font-medium mb-1">Starting Position (chars)</h3>
                        <Show
                            when={!isEditingStartChar()}
                            fallback={
                                <div class="flex gap-2 mt-2">
                                    <input
                                        type="number"
                                        class="bg-base03 px-2 py-1 rounded w-full"
                                        value={editStartCharValue()}
                                        onInput={(e) => setEditStartCharValue(parseInt(e.currentTarget.value) || 0)}
                                    />
                                    <Button size="sm" variant="secondary" onClick={saveStartChar}>
                                        Save
                                    </Button>
                                    <Button size="sm" variant="primary" onClick={cancelEditStartChar}>
                                        Cancel
                                    </Button>
                                </div>
                            }
                        >
                            <div class="flex items-center justify-between">
                                <p class="text-xl font-semibold">{sessionState.initialCharsPosition}</p>
                                <Button size="sm" variant="secondary" onClick={startEditStartChar}>
                                    Edit
                                </Button>
                            </div>
                        </Show>
                    </div>
                    <div class="bg-base02 p-4 rounded">
                        <h3 class="text-sm font-medium mb-1">Reading Speed</h3>
                        <p class="text-xl font-semibold">{readingSpeed()}</p>
                    </div>
                    <div class="bg-base02 p-4 rounded">
                        <h3 class="text-sm font-medium mb-1">Progress</h3>
                        <div class="w-full bg-base03 rounded-full h-2.5 mt-2">
                            <div class="bg-base0B h-2.5 rounded-full" style={{ width: `${progress()}%` }} />
                        </div>
                        <p class="text-sm mt-2">{progress()} % completed</p>
                    </div>
                </Show>
            </div>
        </div>
    )
}
