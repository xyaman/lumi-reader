import { createEffect, For, onCleanup, onMount, Show } from "solid-js"
import ReaderSettings from "./ReaderSettings"
import Sidebar from "./Sidebar"
import ThemeList from "./Themelist"
import { useReaderContext } from "@/context/reader"
import { ThemeProvider } from "@/context/theme"
import { IBookmark } from "@/lib/epub"

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
                <ReaderSettings onSave={() => setReaderStore("shouldReload", true)} />
                <ThemeProvider>
                    <ThemeList selectOnly />
                </ThemeProvider>
            </div>
        </Sidebar>
    )
}

export function ReaderLeftSidebar() {
    const navigationGoTo = () => {}
    const { bookmarkGoTo, readerStore, setReaderStore } = useReaderContext()

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
                <BookmarksSidebarContent onItemClick={(b) => bookmarkGoTo(b)} />
            </Show>
        </Sidebar>
    )
}

export function TocSidebarContent(props: { goTo: (href?: string) => void }) {
    const { readerStore } = useReaderContext()
    return (
        <For each={readerStore.book.manifest.nav}>
            {(item) => (
                <p
                    class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-[var(--base00)]"
                    onClick={() => props.goTo(item.href)}
                >
                    {item.text}
                </p>
            )}
        </For>
    )
}

export function BookmarksSidebarContent(props: { onItemClick: (b: IBookmark) => void }) {
    const { readerStore, setReaderStore } = useReaderContext()

    return (
        <div class="max-h-[90vh] overflow-y-auto">
            <For each={readerStore.book.bookmarks}>
                {(b) => (
                    <p
                        class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-[var(--base00)]"
                        onClick={() => {
                            setReaderStore("sideBar", null)
                            props.onItemClick(b)
                        }}
                    >
                        <span innerHTML={b.content} />
                    </p>
                )}
            </For>
        </div>
    )
}
