import { createSignal, For, onCleanup } from "solid-js"
import { EpubBook } from "./lib/epub"

export default function BookLibrary() {
    const [books, setBooks] = createSignal<EpubBook[]>([])
    const [covers, setCovers] = createSignal<Record<number, string>>({})

    EpubBook.getAll().then((books) => {
        setBooks(books)
        const coversMap: Record<number, string> = {}
        books.forEach((book) => {
            const url = URL.createObjectURL(book.manifest.imgs[0].blob)
            coversMap[book.id] = url
        })
        setCovers(coversMap)
    })

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

    onCleanup(() => {
        const coverObjs = covers()
        for (const id in coverObjs) {
            URL.revokeObjectURL(coverObjs[id])
        }
    })

    return (
        <div class="h-dvh flex flex-col bg-gray-100">
            {/* Navbar */}
            <nav class="bg-white shadow-md border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-gray-800">lumireader</h1>
                <div class="flex gap-3">
                    <label class="relative inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
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
                        class="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                    >
                        Settings
                    </a>
                    <button class="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">
                        Profile
                    </button>
                </div>
            </nav>

            {/* Main content */}
            <main class="flex-1 overflow-y-auto p-6">
                <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                    <For each={books()}>
                        {(book) => (
                            <div class="overflow-hidden rounded-md shadow hover:shadow-lg transition cursor-pointer bg-white">
                                <a href={`reader/${book.id}`}>
                                    <img
                                        src={covers()[book.id!]}
                                        alt={book.metadata.title}
                                        class="aspect-[3/4] w-full object-cover"
                                    />
                                </a>
                                <progress
                                    class="block w-full h-2 bg-gray-200"
                                    value={book.currChars}
                                    max={book.totalChars}
                                />
                            </div>
                        )}
                    </For>
                </div>
            </main>
        </div>
    )
}
