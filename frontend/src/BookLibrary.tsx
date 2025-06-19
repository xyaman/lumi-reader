import { createSignal, For, onCleanup, createEffect, onMount } from "solid-js"
import { IconSettings, IconTrash, IconUpload } from "@/components/icons"
import { EpubBook } from "@/lib/epub"

const LS_SORTBY = "library:sortBy"
const LS_DIRECTION = "library:direction"

export default function BookLibrary() {
    const [books, setBooks] = createSignal<EpubBook[]>([])
    const [covers, setCovers] = createSignal<Record<number, string>>({})

    const [sortBy, setSortBy] = createSignal<"lastModified" | "creationDate">(
        (localStorage.getItem(LS_SORTBY) as "lastModified" | "creationDate") || "lastModified",
    )
    const [direction, setDirection] = createSignal<"asc" | "desc">(
        (localStorage.getItem(LS_DIRECTION) as "asc" | "desc") || "desc",
    )

    const sortBooks = (books: EpubBook[]) => {
        const dir = direction() === "desc" ? -1 : 1
        return [...books].sort((a, b) => {
            const aVal = a[sortBy()] ?? 0
            const bVal = b[sortBy()] ?? 0
            return (aVal - bVal) * dir
        })
    }

    const onBook = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.item(0)
        if (file) {
            EpubBook.fromFile(file).then((b) => {
                const id = b.id!
                const url = URL.createObjectURL(b.manifest.imgs[0].blob)
                setCovers((prev) => ({ ...prev, [id]: url }))
                setBooks((prev) => [...prev, b])
            })
        }
    }

    onMount(async () => {
        const books = await EpubBook.getAll()
        setBooks(sortBooks(books))
        const coversMap: Record<number, string> = {}
        books.forEach((book) => {
            const url = URL.createObjectURL(book.manifest.imgs[0].blob)
            coversMap[book.id] = url
        })
        setCovers(coversMap)
    })

    onCleanup(() => {
        const coverObjs = covers()
        for (const id in coverObjs) {
            URL.revokeObjectURL(coverObjs[id])
        }
    })

    createEffect(() => setBooks((prev) => sortBooks(prev)))
    createEffect(() => localStorage.setItem(LS_SORTBY, sortBy()))
    createEffect(() => localStorage.setItem(LS_DIRECTION, direction()))

    return (
        <div class="body-theme h-dvh flex flex-col">
            <nav class="navbar-theme border-b shadow px-6 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold">lumireader</h1>
                <div class="flex gap-3 items-center">
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-medium">Sort by:</label>
                        <select
                            class="button-theme px-2 py-1 rounded bg-transparent border border-gray-300 dark:border-zinc-700"
                            value={sortBy()}
                            onInput={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
                        >
                            <option value="lastModified">Last Updated</option>
                            <option value="creationDate">Date Added</option>
                        </select>
                        <button
                            class="button-theme px-2 py-1 rounded border border-gray-300 dark:border-zinc-700"
                            onClick={() => setDirection((d) => (d === "asc" ? "desc" : "asc"))}
                            aria-label="Toggle sort direction"
                        >
                            {direction() === "asc" ? "↑" : "↓"}
                        </button>
                    </div>
                    <label
                        class="button-theme relative inline-flex items-center justify-center px-4 py-2 rounded-lg transition cursor-pointer"
                        aria-label="Upload epub"
                    >
                        <IconUpload />
                        <span class="sr-only">Upload epub</span>
                        <input
                            type="file"
                            accept=".epub"
                            onInput={onBook}
                            class="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </label>
                    <a
                        href="/settings"
                        class="button-theme flex items-center justify-center px-4 py-2 rounded-lg shadow-sm hover:opacity-80 transition"
                        aria-label="Settings"
                    >
                        <IconSettings />
                    </a>
                </div>
            </nav>
            <main class="flex-1 overflow-y-auto p-6">
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                    <For each={books()}>
                        {(book) => (
                            <a href={`/reader/${book.id}`} class="block group">
                                <div class="card-theme relative rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
                                    <img
                                        src={covers()[book.id!]}
                                        alt={book.metadata.title}
                                        class="aspect-[3/4] w-full object-cover"
                                    />
                                    <button
                                        class="absolute w-8 h-8 top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-zinc-800/80 text-gray-700 dark:text-white rounded-full p-1 shadow transition flex items-center justify-center"
                                        onClick={() => EpubBook.deleteById(book.id)}
                                        aria-label="Delete book"
                                    >
                                        <IconTrash />
                                    </button>
                                    <div class="px-3 py-2">
                                        <p class="text-sm truncate">{book.metadata.title}</p>
                                        <progress
                                            class="progress-theme w-full h-2 rounded [&::-webkit-progress-bar]:rounded [&::-webkit-progress-value]:rounded-full"
                                            value={book.currChars}
                                            max={book.totalChars}
                                        />
                                    </div>
                                </div>
                            </a>
                        )}
                    </For>
                </div>
            </main>
        </div>
    )
}
