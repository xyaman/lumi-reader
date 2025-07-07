import { createSignal, For, Show } from "solid-js"
import { EpubBook } from "@/lib/epub"
import { ReaderSourceDB, ReaderSourceLightRecord } from "./lib/db"
import { useAuthContext } from "./context/auth"
import BooksGrid from "./components/library/BooksGrid"
import BookshelvesSidebar from "@/components/library/BookshelvesList"
import { useLibraryContext } from "@/context/library"
import BookLibraryNavbar from "@/components/library/BookLibraryNavbar"
import { SquaresIcon } from "./components/icons"
import FollowingActivitySidebar from "./components/FollowingActivitySidebar"

export default function BookLibrary() {
    const { authStore } = useAuthContext()
    const user = () => authStore.user

    const { state, setState, setSortParams, toggleBookInShelf } = useLibraryContext()

    const books = () => state.books
    const setBooks = (books: ReaderSourceLightRecord[]) => setState("books", books)
    const [selectedBook, setSelectedBook] = createSignal<ReaderSourceLightRecord | null>(null)
    const [sidebarOpen, setSidebarOpen] = createSignal(false)

    const sort = () => state.sort
    const dir = () => state.dir

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
                            <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                                <button
                                    class="button px-3 py-2 flex flex-row gap-2 md:hidden"
                                    onClick={() => setSidebarOpen(true)}
                                >
                                    <SquaresIcon />
                                    <span>Bookshelves</span>
                                </button>

                                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <span class="text-sm font-medium" style="color: var(--base05)">
                                        Sort by:
                                    </span>
                                    <div class="flex gap-2">
                                        <select
                                            class="flex-1 px-3 py-2 rounded-lg border text-sm sm:flex-initial sm:min-w-[140px] bg-(--base01) border-(--base03) hover:bg-(--base02)"
                                            value={sort()}
                                            onInput={(e) =>
                                                setSortParams(
                                                    e.currentTarget.value as any,
                                                    undefined,
                                                )
                                            }
                                        >
                                            <option value="lastModifiedDate">Last Updated</option>
                                            <option value="creationDate">Date Added</option>
                                        </select>
                                        <button
                                            class="px-3 py-2 rounded-lg border transition-colors min-w-[2.5rem] flex items-center justify-center bg-(--base01) border-(--base03) hover:bg-(--base02)"
                                            onClick={() =>
                                                setSortParams(
                                                    undefined,
                                                    dir() === "asc" ? "desc" : "asc",
                                                )
                                            }
                                            title={
                                                dir() === "asc"
                                                    ? "Sort ascending"
                                                    : "Sort descending"
                                            }
                                        >
                                            <span class="text-lg leading-none">
                                                {dir() === "asc" ? "↑" : "↓"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <BooksGrid
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
                            <FollowingActivitySidebar />
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
