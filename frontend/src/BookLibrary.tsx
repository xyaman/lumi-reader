import { createSignal, For, Show, onCleanup, createEffect, onMount } from "solid-js"
import { IconSettings, IconTrash, IconUpload } from "@/components/icons"
import { EpubBook } from "@/lib/epub"
import { ReaderSourceDB, ReaderSourceLightRecord } from "./lib/readerSourceDb"

const LS_SORT = "library:sortBy"
const LS_DIR = "library:direction"

type Shelf = { id: number; name: string; bookIds: number[] }

export default function BookLibrary() {
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
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file || (!file.type.includes("epub") && !file.name.endsWith(".epub"))) return

        const book = await EpubBook.fromFile(file)
        book.deinit()

        const light = await ReaderSourceDB.getLightBookById(book.localId)
        if (light) {
            setBooks((prev) => sortBooks([...prev, light]))
            if (light.coverImage) {
                setCovers((prev) => ({
                    ...prev,
                    [light.localId]: URL.createObjectURL(light.coverImage!.blob),
                }))
            }
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
        <div class="body-theme h-dvh flex">
            {/* Sidebar */}
            <aside class="w-64 border-r p-4 flex flex-col gap-4">
                <div class="flex items-center">
                    <h2 class="text-lg font-semibold">Bookshelves</h2>
                    <button
                        class="button-theme-alt text-sm ml-auto rounded-lg p-2"
                        onClick={() => setEditShelf({ id: -1, name: "" })}
                    >
                        + New
                    </button>
                </div>

                <div class="flex justify-between items-center mb-2">
                    <button
                        class={`flex-1 text-left truncate text-sm ${
                            activeShelf() === null
                                ? "font-semibold border-l-2 pl-1"
                                : "text-zinc-800 dark:text-zinc-100"
                        }`}
                        onClick={() => setActiveShelf(null)}
                    >
                        All Books ({books().length})
                    </button>
                </div>

                <div class="flex flex-col gap-2 overflow-y-auto">
                    <For each={shelves()}>
                        {(s) => (
                            <div class="flex items-center gap-2 group">
                                <button
                                    class={`flex-1 text-left truncate text-sm ${
                                        activeShelf() === s.id
                                            ? "font-semibold border-l-2 pl-1"
                                            : "text-zinc-800 dark:text-zinc-100"
                                    }`}
                                    onClick={() => setActiveShelf(s.id)}
                                >
                                    {s.name} ({s.bookIds.length})
                                </button>

                                <button
                                    class="button-theme-alt rounded-lg px-2 py-1 text-xs opacity-0 group-hover:opacity-100"
                                    onClick={() => setEditShelf({ id: s.id, name: s.name })}
                                >
                                    Edit
                                </button>

                                <button
                                    class="button-theme-alt rounded-lg px-2 py-1 text-xs opacity-0 group-hover:opacity-100"
                                    onClick={() => deleteShelf(s.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </For>
                </div>

                {/* Shelf Creation Modal */}
                <Show when={editShelf()?.id}>
                    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div class="body-theme rounded-xl p-6 w-full max-w-sm">
                            <h3 class="text-lg font-semibold mb-4">
                                {editShelf()?.id === -1 ? "Create New Shelf" : "Edit Shelf"}
                            </h3>

                            <input
                                class="w-full px-3 py-2 border rounded text-sm"
                                placeholder="Shelf name"
                                value={editShelf()?.name}
                                onInput={(e) =>
                                    setEditShelf((prev) => ({
                                        ...prev!,
                                        name: e.currentTarget.value,
                                    }))
                                }
                            />
                            <div class="mt-4 flex justify-end gap-2">
                                <button
                                    class="button-theme-alt rounded-lg p-2 text-sm"
                                    onClick={() => setEditShelf(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    class="button-theme-alt rounded-lg p-2 text-sm"
                                    onClick={async () => {
                                        const name = editShelf()?.name.trim()
                                        if (!name) return
                                        if (editShelf()?.id === -1) {
                                            await ReaderSourceDB.createShelf?.(name)
                                        } else {
                                            await ReaderSourceDB.updateShelf?.({
                                                id: editShelf()!.id,
                                                name,
                                                bookIds:
                                                    shelves().find((s) => s.id === editShelf()!.id)
                                                        ?.bookIds || [],
                                            })
                                        }
                                        await loadShelves()
                                        setEditShelf(null)
                                    }}
                                >
                                    {editShelf()?.id === -1 ? "Create" : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </Show>
            </aside>

            {/* Main */}
            <div class="flex-1 flex flex-col">
                <nav class="navbar-theme border-b shadow px-6 py-4 flex justify-between items-center">
                    <h1 class="text-2xl font-bold">lumireader</h1>
                    <div class="flex gap-3 items-center">
                        <label class="button-theme relative px-4 py-2 rounded-lg cursor-pointer">
                            <IconUpload />
                            <span class="sr-only">Upload epub</span>
                            <input
                                type="file"
                                accept=".epub"
                                onInput={handleUpload}
                                class="absolute inset-0 opacity-0"
                            />
                        </label>
                        <a href="/settings" class="button-theme px-4 py-2 rounded-lg">
                            <IconSettings />
                        </a>
                    </div>
                </nav>

                <main class="flex-1 overflow-y-auto p-6">
                    <div class="flex items-center gap-2 mb-4">
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

                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                        <For
                            each={
                                activeShelf() === null
                                    ? books()
                                    : books().filter((b) =>
                                          shelves()
                                              .find((s) => s.id === activeShelf())
                                              ?.bookIds.includes(b.localId),
                                      )
                            }
                        >
                            {(b) => (
                                <div class="relative group">
                                    <a href={`/reader/${b.localId}`} class="block">
                                        <div class="card-theme rounded-lg shadow-md hover:shadow-lg overflow-hidden">
                                            <img
                                                src={covers()[b.localId]}
                                                alt={b.title}
                                                class="aspect-[3/4] w-full object-cover"
                                            />
                                            <button
                                                class="absolute top-2 right-11 w-8 h-8 opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-zinc-800/80 rounded-full p-1 shadow flex items-center justify-center"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    setSelectedBook(b)
                                                }}
                                            >
                                                ℹ️
                                            </button>
                                            <button
                                                class="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 bg-zinc-800/80 rounded-full p-1 shadow flex items-center justify-center"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    ReaderSourceDB.deleteBook(b.localId).then(
                                                        () => {
                                                            setBooks((prev) =>
                                                                prev.filter(
                                                                    (i) => i.localId !== b.localId,
                                                                ),
                                                            )
                                                        },
                                                    )
                                                }}
                                            >
                                                <IconTrash />
                                            </button>
                                            <div class="px-3 py-2">
                                                <p class="text-sm truncate">{b.title}</p>
                                                <progress
                                                    class="progress-theme w-full h-2 rounded"
                                                    value={b.currChars}
                                                    max={b.totalChars}
                                                />
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </For>
                    </div>
                </main>
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
                                            <span class="text-xs text-zinc-500">
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
    )
}
