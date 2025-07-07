import { createSignal, For, Show, onCleanup, onMount } from "solid-js"
import { EpubBook } from "@/lib/epub"
import { ReaderSourceDB, ReaderSourceLightRecord } from "./lib/db"
import { useAuthContext } from "./context/auth"
import api from "@/lib/api"
import { timeAgo } from "@/lib/utils"
import BooksGrid from "./components/library/BooksGrid"
import BookshelvesSidebar from "@/components/library/BookshelvesList"
import { useLibraryContext } from "@/context/library"
import BookLibraryNavbar from "@/components/library/BookLibraryNavbar"
import { SquaresIcon } from "./components/icons"

export default function BookLibrary() {
    const { authStore } = useAuthContext()
    const user = () => authStore.user

    const [followings, setFollowings] = createSignal<
        {
            id: string
            username: string
            status?: {
                last_activity: string
                timestamp: number
            }
        }[]
    >([])
    const [visibleCount, setVisibleCount] = createSignal(10) // initial visible batch

    const loadFollowings = async () => {
        const currUser = user()
        if (!currUser) return []

        const res = await api.fetchUserFollows(currUser.id)
        const followingList = res.following

        // Collect user IDs
        const userIds = followingList.map((f: any) => f.id)
        let statusBatch: Record<number, any> = {}

        if (userIds.length > 0) {
            try {
                const statusRes = await api.fetchUserStatusBatch(userIds)
                statusBatch = Object.fromEntries(
                    statusRes.results.map((s: any) => [
                        s.user_id,
                        {
                            last_activity: s.last_activity,
                            timestamp: timeAgo(s.timestamp),
                        },
                    ]),
                )
            } catch (e) {
                console.error("Failed to fetch user status batch", e)
            }
        }

        const usersWithStatus = followingList.map((f: any) => ({
            ...f,
            status: statusBatch[f.id] || null,
        }))

        setFollowings(usersWithStatus)
    }

    onMount(() => {
        loadFollowings()
    })

    onMount(() => {
        const onScroll = () => {
            const el = document.getElementById("followings-scroll")
            if (!el) return
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
                setVisibleCount((v) => v + 5) // load more when near bottom
            }
        }

        const el = document.getElementById("followings-scroll")
        el?.addEventListener("scroll", onScroll)
        onCleanup(() => el?.removeEventListener("scroll", onScroll))
    })

    const { state, setState, setSortParams, toggleBookInShelf } = useLibraryContext()

    const books = () => state.books
    const setBooks = (books: ReaderSourceLightRecord[]) => setState("books", books)

    const [selectedBook, setSelectedBook] = createSignal<ReaderSourceLightRecord | null>(null)

    const sort = () => state.sort
    const dir = () => state.dir

    const [sidebarOpen, setSidebarOpen] = createSignal(false)

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        const newBooks: ReaderSourceLightRecord[] = []

        for (const file of files) {
            if (!file.type.includes("epub") && !file.name.endsWith(".epub")) continue
            const book = await EpubBook.fromFile(file)
            book.deinit()
            if (!book.localId) continue

            const light = await ReaderSourceDB.getLightBookById(book.localId)
            if (light) {
                newBooks.push(light)
            }
        }

        if (newBooks.length > 0) {
            setBooks(newBooks)
        }
    }

    // --- Render ---
    return (
        <div class="body-theme flex flex-col min-h-screen">
            {/* Navbar */}
            <BookLibraryNavbar handleUpload={handleUpload} user={user} />

            <div class="flex flex-1 min-h-0 mt-14">
                <BookshelvesSidebar
                    isOverlay={sidebarOpen}
                    onCloseOverlay={() => setSidebarOpen(false)}
                />

                {/* Main layout */}
                <div class="flex flex-1 flex-col md:flex-row">
                    {/* Main */}
                    <div class="flex-1 flex flex-col md:flex-row">
                        <main class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 max-h-[calc(100vh-3.5rem)]">
                            <div class="flex flex-wrap items-center gap-2 mb-4">
                                <button
                                    class="button px-3 flex flex-row gap-2 md:hidden"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <SquaresIcon />
                                    <span>Boolshelves</span>
                                </button>
                                <label class="text-sm font-medium">Sort by:</label>
                                <select
                                    class="button-theme px-2 py-1 rounded border"
                                    value={sort()}
                                    onInput={(e) =>
                                        setSortParams(e.currentTarget.value as any, undefined)
                                    }
                                >
                                    <option value="lastModifiedDate">Last Updated</option>
                                    <option value="creationDate">Date Added</option>
                                </select>
                                <button
                                    class="button-theme px-2 py-1 rounded border"
                                    onClick={() =>
                                        setSortParams(undefined, dir() === "asc" ? "desc" : "asc")
                                    }
                                >
                                    {dir() === "asc" ? "↑" : "↓"}
                                </button>
                            </div>
                            <BooksGrid
                                books={
                                    state.activeShelf === null
                                        ? books()
                                        : books().filter((b) =>
                                              state.shelves
                                                  .find((s) => s.id === state.activeShelf)
                                                  ?.bookIds.includes(b.localId),
                                          )
                                }
                                onSelectBook={setSelectedBook}
                                onDeleteBook={(b) => {
                                    ReaderSourceDB.deleteBook(b.localId).then(() => {
                                        setBooks(
                                            books().filter(
                                                (i: ReaderSourceLightRecord) =>
                                                    i.localId !== b.localId,
                                            ),
                                        )
                                    })
                                }}
                            />
                        </main>
                        {/* Right sidebar (only if logged in) */}
                        <Show when={user()}>
                            <aside class="navbar-theme hidden md:flex border-l p-4 flex-col w-48 lg:w-64 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
                                <h2 class="text-md font-semibold mb-2">Followings Reading</h2>
                                <div
                                    id="followings-scroll"
                                    class="overflow-y-auto flex-1 space-y-3"
                                >
                                    <For each={followings().slice(0, visibleCount())}>
                                        {(f) => (
                                            <div class="p-2 border rounded-md text-sm">
                                                <p class="font-medium truncate">{f.username}</p>
                                                <Show when={f.status}>
                                                    <div class="text-xs text-gray-500 mt-1">
                                                        Last Activity: {f.status!.last_activity}
                                                        <br />
                                                        Last Active: {f.status!.timestamp}
                                                    </div>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </aside>
                        </Show>
                    </div>
                </div>

                {/* Shelf Modal */}
                <Show when={selectedBook()}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div class="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-xl w-full max-w-md">
                            <h3 class="text-xl font-semibold mb-4 text-zinc-800 dark:text-white">
                                Add to shelves
                            </h3>
                            <div class="space-y-2 max-h-[300px] overflow-y-auto">
                                <For each={state.shelves}>
                                    {(s) => {
                                        const inShelf = s.bookIds.includes(selectedBook()!.localId)
                                        return (
                                            <button
                                                class="w-full px-4 py-2 rounded button-theme flex justify-between items-center"
                                                onClick={() =>
                                                    toggleBookInShelf(s.id, selectedBook()!.localId)
                                                }
                                            >
                                                <span>
                                                    {inShelf ? "✓" : "+"} {s.name}
                                                </span>
                                                <span class="text-xs">
                                                    {inShelf ? "Remove" : "Add"}
                                                </span>
                                            </button>
                                        )
                                    }}
                                </For>
                            </div>
                            <div class="mt-6 text-right">
                                <button
                                    class="button-theme px-4 py-2"
                                    onClick={() => setSelectedBook(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </Show>
            </div>
        </div>
    )
}
