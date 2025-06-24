import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
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

    return (
        <Sidebar
            open={readerStore.sideBar !== null && readerStore.sideBar !== "settings"}
            side="left"
            title={readerStore.sideBar === "toc" ? "Table of Contents" : "Bookmarks"}
            overlay
            onClose={() => setReaderStore("sideBar", null)}
        >
            <Show when={readerStore.sideBar === "toc"}>
                <TocSidebarContent goTo={navigationGoTo} />
            </Show>
            <Show when={readerStore.sideBar === "bookmarks"}>
                <BookmarksSidebarContent onItemClick={bookmarkGoTo} />
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
