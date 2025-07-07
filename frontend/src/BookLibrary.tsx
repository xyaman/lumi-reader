import { createSignal, For, Show, onCleanup, createEffect, onMount } from "solid-js"
import { IconSettings, IconUpload } from "@/components/icons"
import { EpubBook } from "@/lib/epub"
import { ReaderSourceDB, ReaderSourceLightRecord } from "./lib/db"
import Navbar from "./components/Navbar"
import { A } from "@solidjs/router"
import { useAuthContext } from "./context/auth"
import api from "@/lib/api"
import { timeAgo } from "@/lib/utils"
import BooksGrid from "./components/library/BooksGrid"
import BookshelvesSidebar from "./components/library/BookshelvesList"

const LS_SORT = "library:sortBy"
const LS_DIR = "library:direction"

type BookLibraryNavbarProps = {
    handleUpload: (e: Event) => void
    user: () => any
}

function BookLibraryNavbar(props: BookLibraryNavbarProps) {
    const { handleUpload, user } = props
    return (
        <Navbar fixed title="lumireader">
            <Navbar.Left>
                <A
                    href="/"
                    class="text-xl font-bold text-[var(--base07)] hover:text-[var(--base0D)] transition-colors"
                >
                    lumireader
                </A>
            </Navbar.Left>
            <Navbar.Right>
                <label class="button relative px-3 py-2 rounded-lg cursor-pointer">
                    <IconUpload />
                    <span class="sr-only">Upload EPUB</span>
                    <input
                        type="file"
                        accept=".epub"
                        multiple
                        onInput={handleUpload}
                        class="absolute inset-0 opacity-0"
                    />
                </label>
                <A href="/settings" class="button px-3 py-2 rounded-lg">
                    <IconSettings />
                </A>
                <Show
                    when={user()}
                    fallback={
                        <>
                            <A href="/login" class="button-theme px-3 py-2 rounded-lg">
                                Login
                            </A>
                            <A href="/register" class="button-theme px-3 py-2 rounded-lg">
                                Register
                            </A>
                        </>
                    }
                >
                    <A href="/users" class="button px-3 py-2 rounded-lg">
                        Profile
                    </A>
                </Show>
            </Navbar.Right>
        </Navbar>
    )
}

type Shelf = { id: number; name: string; bookIds: number[] }

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

    const [books, setBooks] = createSignal<ReaderSourceLightRecord[]>([])
    const [covers, setCovers] = createSignal<Record<number, string>>({})
    const [shelves, setShelves] = createSignal<Shelf[]>([])
    const [activeShelf, setActiveShelf] = createSignal<number | null>(null)

    const [editShelf, setEditShelf] = createSignal<{ id: number; name: string } | null>(null)
    const [selectedBook, setSelectedBook] = createSignal<ReaderSourceLightRecord | null>(null)

    const [sort, setSort] = createSignal<"lastModifiedDate" | "creationDate">(
        (localStorage.getItem(LS_SORT) as any) || "lastModifiedDate",
    )
    const [dir, setDir] = createSignal<"asc" | "desc">(
        (localStorage.getItem(LS_DIR) as any) || "desc",
    )

    const [sidebarOpen, setSidebarOpen] = createSignal(false)

    // --- Shelves ---
    const loadShelves = async () => {
        const all = await ReaderSourceDB.listShelves()
        setShelves(all || [])
    }

    const deleteShelf = async (shelfId: number) => {
        if (!confirm("Are you sure you want to delete this shelf?")) return
        await ReaderSourceDB.deleteShelf(shelfId)
        if (activeShelf() === shelfId) setActiveShelf(null)
        await loadShelves()
    }

    const toggleBookInShelf = async (shelfId: number) => {
        const bookId = selectedBook()!.localId
        const shelf = shelves().find((s) => s.id === shelfId)
        const exists = shelf?.bookIds.includes(bookId)
        if (exists) {
            await ReaderSourceDB.removeBookFromShelf(shelfId, bookId)
        } else {
            await ReaderSourceDB.addBookToShelf(shelfId, bookId)
        }
        loadShelves()
    }

    // --- Book handling ---
    const sortBooks = (bks: ReaderSourceLightRecord[]) => {
        const d = dir() === "desc" ? -1 : 1
        return [...bks].sort((a, b) => ((a[sort()] ?? 0) - (b[sort()] ?? 0)) * d)
    }

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        const newBooks: ReaderSourceLightRecord[] = []
        const newCovers: Record<number, string> = {}

        for (const file of files) {
            if (!file.type.includes("epub") && !file.name.endsWith(".epub")) continue
            const book = await EpubBook.fromFile(file)
            book.deinit()
            if (!book.localId) continue

            const light = await ReaderSourceDB.getLightBookById(book.localId)
            if (light) {
                newBooks.push(light)
                if (light.coverImage) {
                    newCovers[light.localId] = URL.createObjectURL(light.coverImage.blob)
                }
            }
        }

        if (newBooks.length > 0) {
            setBooks((prev) => sortBooks([...prev, ...newBooks]))
            setCovers((prev) => ({ ...prev, ...newCovers }))
        }
    }

    // --- Lifecycle ---
    onMount(async () => {
        const allBooks = await ReaderSourceDB.allLightBooks()
        const coverMap: Record<number, string> = {}
        allBooks.forEach((b) => {
            if (b.coverImage) {
                coverMap[b.localId] = URL.createObjectURL(b.coverImage.blob)
            }
        })
        setBooks(sortBooks(allBooks))
        setCovers(coverMap)
        loadShelves()
    })

    onCleanup(() => {
        Object.values(covers()).forEach((url) => URL.revokeObjectURL(url))
    })

    createEffect(() => setBooks((prev) => sortBooks(prev)))
    createEffect(() => localStorage.setItem(LS_SORT, sort()))
    createEffect(() => localStorage.setItem(LS_DIR, dir()))

    // --- Render ---
    return (
        <div class="body-theme flex flex-col min-h-screen">
            {/* Navbar */}
            <BookLibraryNavbar handleUpload={handleUpload} user={user} />

            <div class="flex flex-1 min-h-0 mt-14">
                {/* Sidebar (mobile overlay) */}
                <Show when={sidebarOpen()}>
                    <aside
                        class="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <div
                            class="navbar-theme w-64 h-full p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <BookshelvesSidebar
                                books={books}
                                shelves={shelves}
                                activeShelf={activeShelf}
                                setActiveShelf={setActiveShelf}
                                editShelf={editShelf}
                                setEditShelf={setEditShelf}
                                deleteShelf={deleteShelf}
                                loadShelves={loadShelves}
                            />
                        </div>
                    </aside>
                </Show>

                {/* Main layout */}
                <div class="flex flex-1 flex-col md:flex-row">
                    {/* Sidebar (desktop) */}

                    <aside class="navbar-theme hidden md:flex border-r p-4 flex-col gap-4 md:w-48 lg:w-64 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
                        <BookshelvesSidebar
                            books={books}
                            shelves={shelves}
                            activeShelf={activeShelf}
                            setActiveShelf={setActiveShelf}
                            editShelf={editShelf}
                            setEditShelf={setEditShelf}
                            deleteShelf={deleteShelf}
                            loadShelves={loadShelves}
                        />
                    </aside>

                    {/* Main */}
                    <div class="flex-1 flex flex-col md:flex-row">
                        <main class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 max-h-[calc(100vh-3.5rem)]">
                            <div class="flex flex-wrap items-center gap-2 mb-4">
                                <label class="text-sm font-medium">Sort by:</label>
                                <select
                                    class="button-theme px-2 py-1 rounded border"
                                    value={sort()}
                                    onInput={(e) => setSort(e.currentTarget.value as any)}
                                >
                                    <option value="lastModifiedDate">Last Updated</option>
                                    <option value="creationDate">Date Added</option>
                                </select>
                                <button
                                    class="button-theme px-2 py-1 rounded border"
                                    onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
                                >
                                    {dir() === "asc" ? "↑" : "↓"}
                                </button>
                            </div>
                            <BooksGrid
                                books={
                                    activeShelf() === null
                                        ? books()
                                        : books().filter((b) =>
                                              shelves()
                                                  .find((s) => s.id === activeShelf())
                                                  ?.bookIds.includes(b.localId),
                                          )
                                }
                                covers={covers()}
                                onSelectBook={setSelectedBook}
                                onDeleteBook={(b) => {
                                    ReaderSourceDB.deleteBook(b.localId).then(() => {
                                        setBooks((prev) =>
                                            prev.filter((i) => i.localId !== b.localId),
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
                                <For each={shelves()}>
                                    {(s) => {
                                        const inShelf = s.bookIds.includes(selectedBook()!.localId)
                                        return (
                                            <button
                                                class="w-full px-4 py-2 rounded button-theme flex justify-between items-center"
                                                onClick={() => toggleBookInShelf(s.id)}
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
