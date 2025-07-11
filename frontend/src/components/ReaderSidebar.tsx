import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js"
import ReaderSettings from "./ReaderSettings"
import Sidebar from "./Sidebar"
import ThemeList from "./Themelist"
import { useReaderContext } from "@/context/reader"
import { ThemeProvider } from "@/context/theme"
import { Bookmark } from "@/lib/readerSource"

export function SettingsSidebar() {
    const { readerStore, setReaderStore } = useReaderContext()

    // Prevent scrolling on main view when is open
    createEffect(
        () => (document.body.style.overflow = readerStore.sideBar !== null ? "hidden" : ""),
    )

    return (
        <Sidebar
            side="right"
            overlay
            title="Settings"
            open={readerStore.sideBar == "settings"}
            onClose={() => setReaderStore("sideBar", null)}
        >
            <div class="space-y-4">
                {/* TODO: only reload if changed pagination, vertical etc */}
                <ReaderSettings saveButton />
                <ThemeProvider>
                    <ThemeList selectOnly />
                </ThemeProvider>
            </div>
        </Sidebar>
    )
}

export function ReaderLeftSidebar() {
    const { navigationGoTo, bookmarkGoTo, readerStore, setReaderStore } = useReaderContext()

    const titles = {
        toc: "Table of Contents",
        bookmarks: "Bookmarks",
        session: "Reading Session",
        settings: "",
        generic: "",
    }

    return (
        <Sidebar
            open={readerStore.sideBar !== null && readerStore.sideBar !== "settings"}
            side="left"
            title={titles[readerStore.sideBar || "generic"]}
            overlay
            onClose={() => setReaderStore("sideBar", null)}
        >
            <Show when={readerStore.sideBar === "toc"}>
                <TocSidebarContent goTo={navigationGoTo} />
            </Show>
            <Show when={readerStore.sideBar === "bookmarks"}>
                <BookmarksSidebarContent onItemClick={bookmarkGoTo} />
            </Show>
            <Show when={readerStore.sideBar === "session"}>
                <ReadingSessionSidebar />
            </Show>
        </Sidebar>
    )
}

export function TocSidebarContent(props: { goTo: (file: string) => void }) {
    const { readerStore } = useReaderContext()
    return (
        <For each={readerStore.book.nav}>
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
    const { readerStore, setReaderStore } = useReaderContext()
    const [sortOption, setSortOption] = createSignal("added-newest")

    const sortedBookmarks = createMemo(() => {
        const bookmarks = [...readerStore.book.bookmarks]
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
                            setReaderStore("sideBar", null)
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
    const { readerStore, readingManager } = useReaderContext()
    const session = () => readingManager.activeSession()
    const [currentTime, setCurrentTime] = createSignal(Math.floor(Date.now() / 1000))

    let intervalId: number | null = null
    const startTimer = () => {
        if (intervalId) return
        setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000))
        }, 1000)
    }

    const stopTimer = () => {
        if (!intervalId) return
        clearInterval(intervalId)
        intervalId = null
    }

    createEffect(() => {
        if (readerStore.sideBar === "session") {
            startTimer()
        } else {
            stopTimer()
        }
    })

    onCleanup(() => stopTimer())

    const totalReadingTime = () => {
        const s = session()
        if (!s) return 0

        if (s.isPaused) {
            return s.totalReadingTime
        } else {
            // Add time since last update for real-time display
            const now = currentTime()
            return s.totalReadingTime + (now - s.lastActiveTime)
        }
    }

    const toggleSession = async () => {
        if (session()) {
            if (session()!.isPaused) {
                await readingManager.resumeSession()
            } else {
                await readingManager.pauseSession()
            }
        } else {
            await readingManager.startSession(readerStore.book)
        }

        setCurrentTime(session()!.lastActiveTime)
    }

    const charactersRead = () => {
        const s = session()
        if (!s) return 0
        return s.currChars - s.initialChars
    }

    const readingSpeed = () => {
        const time = totalReadingTime()
        if (charactersRead() === 0 || time === 0) return "0 chars/h"
        return `${Math.ceil((charactersRead() * 3600) / time)} chars/h`
    }

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60

        return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
    }

    const progress = () => {
        return Math.floor((readerStore.currChars * 100) / readerStore.book.totalChars)
    }

    return (
        <div class="max-h-[90vh] overflow-y-auto">
            <p class="text-md mb-2">
                Session: {session() ? (session()!.isPaused ? "Paused" : "Active") : "None"}
            </p>

            <div class="space-y-4">
                <button class="button px-4 py-2 font-semibold" onClick={toggleSession}>
                    {session() ? (session()!.isPaused ? "Resume" : "Pause") : "Start"}
                </button>

                <div class="bg-(--base02) p-4 rounded">
                    <h3 class="text-sm font-medium mb-1">Reading Time</h3>
                    <p class="text-xl font-semibold">{formatTime(totalReadingTime())}</p>
                </div>
                <div class="bg-(--base02) p-4 rounded">
                    <h3 class="text-sm font-medium mb-1">Characters Read</h3>
                    <p class="text-xl font-semibold">{charactersRead()}</p>
                </div>
                <div class="bg-(--base02) p-4 rounded">
                    <h3 class="text-sm font-medium mb-1">Reading Speed</h3>
                    <p class="text-xl font-semibold">{readingSpeed()}</p>
                </div>
                <div class="bg-(--base02) p-4 rounded">
                    <h3 class="text-sm font-medium mb-1">Progress</h3>
                    <div class="w-full bg-(--base03) rounded-full h-2.5 mt-2">
                        <div
                            class="bg-(--base0B) h-2.5 rounded-full"
                            style={{ width: `${progress()}%` }}
                        ></div>
                    </div>
                    <p class="text-sm mt-2">{progress()} % completed</p>
                </div>
            </div>
        </div>
    )
}
