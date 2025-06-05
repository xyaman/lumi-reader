import { createSignal, For, onCleanup } from "solid-js"
import { EpubBook } from "./lib/epub"

export default function BookLibrary() {
    const [books, setBooks] = createSignal<EpubBook[]>([])
    const [covers, setCovers] = createSignal<Record<number, string>>({})

    // Load books and covers
    EpubBook.getAll().then((books) => {
        setBooks(books)
        const coversMap: Record<number, string> = {}
        books.forEach((book) => {
            const url = URL.createObjectURL(book.manifest.imgs[0].blob)
            coversMap[book.id] = url
        })
        setCovers(coversMap)

        console.log(books)
    })

    // Upload handler
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

    // Cleanup URLs
    onCleanup(() => {
        const coverObjs = covers()
        for (const id in coverObjs) {
            URL.revokeObjectURL(coverObjs[id])
        }
    })

    return (
        <div class="body-theme h-dvh flex flex-col">
            {/* Navbar */}
            <nav class="navbar-theme border-b shadow px-6 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold">lumireader</h1>
                <div class="flex gap-3">
                    <label class="button-theme relative inline-flex items-center px-4 py-2 rounded-lg transition">
                        <span>Upload epub</span>
                        <input
                            type="file"
                            accept=".epub"
                            onInput={onBook}
                            class="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </label>
                    <a
                        href="/settings"
                        class="button-theme flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm hover:opacity-80 transition"
                    >
                        Settings
                    </a>
                </div>
            </nav>

            {/* Main content */}
            <main class="flex-1 overflow-y-auto p-6">
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                    <For each={books()}>
                        {(book) => (
                            <a href={`/reader/${book.id}`} class="block group">
                                <div class="card-theme rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
                                    <img
                                        src={covers()[book.id!]}
                                        alt={book.metadata.title}
                                        class="aspect-[3/4] w-full object-cover"
                                    />
                                    <button
                                        class="absolute w-8 h-8 top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-zinc-800/80 text-gray-700 dark:text-white rounded-full p-1 shadow transition"
                                        onClick={() => EpubBook.deleteById(book.id)}
                                    >
                                        X
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
