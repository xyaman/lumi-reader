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
        <div class="h-dvh flex flex-col bg-white dark:bg-zinc-800 text-gray-900 dark:text-white">
            {/* Navbar */}
            <nav class="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 shadow px-6 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold">lumireader</h1>
                <div class="flex gap-3">
                    <label class="relative inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition">
                        <span>Upload</span>
                        <input
                            type="file"
                            accept=".epub"
                            onInput={onBook}
                            class="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </label>
                    <a
                        href="/settings"
                        class="px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition"
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
                                <div class="bg-white dark:bg-zinc-900 rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
                                    <img
                                        src={covers()[book.id!]}
                                        alt={book.metadata.title}
                                        class="aspect-[3/4] w-full object-cover"
                                    />
                                    <div class="px-3 py-2">
                                        <p class="text-sm truncate">{book.metadata.title}</p>
                                        <progress
                                            class="w-full h-2 rounded bg-gray-200 dark:bg-zinc-700 [&::-webkit-progress-bar]:rounded [&::-webkit-progress-value]:rounded-full"
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
