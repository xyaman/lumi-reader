import { IconFilter, IconUpload } from "./components/icons"
import BooksGrid from "./components/library/BooksGrid"
import { useLibraryContext } from "./context/library"
import { LumiDb, ReaderSourceLightRecord } from "./lib/db"
import { EpubBook } from "./lib/epub"

export default function BookLibrary() {
    const { state, setState, setSortParams, toggleBookInShelf } = useLibraryContext()

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        const newBooks: ReaderSourceLightRecord[] = []

        for (const file of files) {
            if (!file.type.includes("epub") && !file.name.endsWith(".epub")) continue

            // TODO: this also creates the image blob.. check??
            const book = await EpubBook.fromFile(file)
            book.deinit()
            if (!book.localId) continue

            const light = await LumiDb.getLightBookById(book.localId)
            if (light) {
                newBooks.push(light)
            }
        }

        if (newBooks.length > 0) {
            setState("books", (prev) => [...prev, ...newBooks])
        }
    }

    return (
        <>
            <header class="mb-8">
                <div class="flex justify-between">
                    <h1 class="text-3xl font-bold">Your Library</h1>
                    <div class="flex space-x-2">
                        <label class="cursor-pointer relative rounded-md bg-base02 hover:bg-base03 px-4 py-2 flex items-center">
                            <input
                                type="file"
                                accept=".epub"
                                multiple
                                onInput={handleUpload}
                                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <IconUpload />
                            <span class="cursor-pointer ml-2">Upload Book</span>
                        </label>
                        <button class="cursor-pointer bg-base02 hover:bg-base03 px-4 py-2 rounded-md flex items-center">
                            <IconFilter />
                            <span class="ml-2">Filter</span>
                        </button>
                    </div>
                </div>
            </header>
            <BooksGrid onSelectBook={() => {}} onDeleteBook={() => {}} />
        </>
    )
}
