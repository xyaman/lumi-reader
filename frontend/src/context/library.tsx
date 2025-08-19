import { LumiDb, ReaderSourceLightRecord } from "@/lib/db"
import { EpubBook } from "@/lib/epub"
import { batch, createContext, createEffect, JSX, onCleanup, onMount, useContext } from "solid-js"
import { createStore } from "solid-js/store"

type SortField = "byLastUpdate" | "byCreationDate"
type SortDirection = "asc" | "desc"

// TODO: move shelf type (types/db.ts?)
type Shelf = { id: number; name: string; bookIds: number[] }

type LibraryState = {
    books: ReaderSourceLightRecord[]
    shelves: Shelf[]
    activeShelf: number | null

    // { key: book.localId, value: bloburl }
    coverUrls: Record<number, string>
    sort: SortField
    dir: SortDirection
}

type LibraryDispatch = {
    // books related
    createBook: (files: File[]) => Promise<void>
    deleteBook: (localId: number) => Promise<void>

    // shelf related
    createShelf: (name: string) => Promise<void>
    deleteShelf: (shelfId: number) => Promise<void>
    renameShelf: (shelfId: number, name: string) => Promise<void>
    setActiveShelf: (shelfId: number | null) => void
    toggleBookInShelf: (shelfId: number, bookId: number) => Promise<void>

    // misc
    setSortParams: (sort?: SortField, dir?: SortDirection) => void
}

const LibraryStateContext = createContext<LibraryState>()
const LibraryDispatchContext = createContext<LibraryDispatch>()

export default function LibraryProvider(props: { children: JSX.Element }) {
    const [store, setStore] = createStore<LibraryState>({
        books: [],
        shelves: [],
        activeShelf: null,
        coverUrls: {},
        sort: "byLastUpdate",
        dir: "desc",
    })

    // Load and sort books on mount
    onMount(async () => {
        const [books, shelves] = await Promise.all([LumiDb.getAllLightBooks(), LumiDb.getAllBookshelves()])
        setStore("books", books)
        setStore("shelves", shelves)
    })

    // Handle cover images and remove URL blobs on cleanup
    createEffect(() => {
        const coverMap: Record<number, string> = {}
        const urls: string[] = []

        store.books.forEach((book) => {
            if (book.coverImage) {
                const url = URL.createObjectURL(book.coverImage.blob)
                coverMap[book.localId] = url
                urls.push(url)
            }
        })

        setStore("coverUrls", coverMap)
        onCleanup(() => urls.forEach(URL.revokeObjectURL))
    })

    const createBook = async (files: File[]) => {
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
            setStore("books", (prev) => [...prev, ...newBooks])
        }
    }

    const deleteBook = async (localId: number) => {
        await LumiDb.deleteBookById(localId)
        setStore("books", (prev) => prev.filter((book) => book.localId !== localId))
    }

    // Creates a new shelf
    // Updates both the local store and persists the changes to the database.
    const createShelf = async (name: string) => {
        const shelf = await LumiDb.createBookShelf(name)
        setStore("shelves", (shelves) => [...shelves, shelf])
    }

    // Deletes an existing shelf
    // Updates both the local store and persists the changes to the database.
    const deleteShelf = async (shelfId: number) => {
        await LumiDb.deleteBookshelfById(shelfId)
        setStore("shelves", (shelves) => shelves.filter((s) => s.id !== shelfId))
    }

    // Renames a shelf
    // Updates both the local store and persists the changes to the database.
    const renameShelf = async (shelfId: number, name: string) => {
        const shelfIndex = store.shelves.findIndex((s) => s.id === shelfId)
        if (shelfIndex === -1) return

        await LumiDb.updateBookshelf({ id: shelfId, name, bookIds: store.shelves[shelfIndex].bookIds })
        setStore("shelves", shelfIndex, "name", name)
    }

    // Toggles the presence of a book in a specific shelf.
    // Updates both the local store and persists the changes to the database.
    const toggleBookInShelf = async (shelfId: number, bookId: number) => {
        const shelf = store.shelves.find((s) => s.id === shelfId)
        if (!shelf) return

        const exists = shelf.bookIds.includes(bookId)

        setStore(
            "shelves",
            (s) => s.id === shelfId,
            "bookIds",
            (ids) => (exists ? ids.filter((id) => id !== bookId) : [...ids, bookId]),
        )

        if (exists) {
            await LumiDb.removeBookFromShelf(shelfId, bookId)
        } else {
            await LumiDb.addBookToShelf(shelfId, bookId)
        }
    }

    const setActiveShelf = (shelfId: number | null) => setStore("activeShelf", shelfId)

    // -- dispatch: misc

    // Sort params
    // TODO: update local storage too
    const setSortParams = (sort?: SortField, dir?: SortDirection) => {
        batch(() => {
            if (sort) setStore("sort", sort)
            if (dir) setStore("dir", dir)
        })
    }

    return (
        <LibraryStateContext.Provider value={store}>
            <LibraryDispatchContext.Provider
                value={{
                    createBook,
                    deleteBook,
                    createShelf,
                    deleteShelf,
                    renameShelf,
                    toggleBookInShelf,
                    setActiveShelf,
                    setSortParams,
                }}
            >
                {props.children}
            </LibraryDispatchContext.Provider>
        </LibraryStateContext.Provider>
    )
}

export function useLibraryState() {
    const ctx = useContext(LibraryStateContext)
    if (!ctx) throw new Error("useLibraryState must be used inside <LibraryProvider>")
    return ctx
}

export function useLibraryDispatch() {
    const ctx = useContext(LibraryDispatchContext)
    if (!ctx) throw new Error("useLibraryDispatch must be used inside <LibraryProvider>")
    return ctx
}
