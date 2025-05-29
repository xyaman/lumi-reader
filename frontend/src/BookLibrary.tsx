import { createSignal, For, onCleanup } from "solid-js"
import { EpubBook } from "./lib/epub"

export default function BookLibrary() {
    const [books, setBooks] = createSignal<EpubBook[]>([])
    const [covers, setCovers] = createSignal<Record<number, string>>({})

    EpubBook.getAll().then((books) => {
        setBooks(books)
        console.log(books)
        // Generate covers for all books
        const coversMap: Record<number, string> = {}
        books.forEach((book) => {
            const url = URL.createObjectURL(book.manifest.imgs[0].blob)
            coversMap[book.id] = url // Use the book's ID as the key
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
        <>
            <div class="h-dvh p-6 bg-gray-300">
                <header class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <h1 class="text-3xl font-bold tracking-tight text-black">Reader</h1>
                    <div class="flex flex-wrap gap-3 items-center">
                        <label class="cursor-pointer px-4 py-2 rounded-lg bg-gray-800 text-white shadow-sm hover:opacity-80 transition">
                            Upload
                            <input onInput={onBook} type="file" accept=".epub" class="hidden" />
                        </label>
                        <a
                            href="/settings"
                            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white shadow-sm hover:opacity-80 transition"
                        >
                            Settings
                        </a>
                        <button class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white shadow-sm hover:opacity-80 transition">
                            Profile
                        </button>
                    </div>
                </header>

                <main class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                    <For each={books()}>
                        {(book) => (
                            <div class="overflow-hidden transition-shadow cursor-pointer transform">
                                <a href={`reader/${book.id}`}>
                                    <img
                                        src={covers()[book.id!]}
                                        alt={book.metadata.title}
                                        class="aspect-[3/4] w-full object-cover hover:shadow-lg"
                                    />
                                </a>
                                <progress
                                    class="z-10 bottom-0 right-0 block float-right w-full"
                                    value={book.currChars}
                                    max={book.totalChars}
                                />
                            </div>
                        )}
                    </For>
                </main>
            </div>
        </>
    )
}
