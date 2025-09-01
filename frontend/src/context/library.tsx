import { LumiDb, ReaderSourceLightRecord } from "@/db"
import { EpubBook } from "@/lib/epub"
import { liveQuery } from "dexie"
import { batch, createContext, JSX, onCleanup, onMount, useContext } from "solid-js"
import { createStore, reconcile } from "solid-js/store"

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

    // Memoized displayed books: automatically filters and sorts.
    // Components just use this and never have to worry about sorting/filtering logic.
    // const displayedBooks = createMemo(() => {
    //     const shelf = store.activeShelfId ? store.shelves.find((s) => s.id === store.activeShelfId) : null
    //
    //     const books = shelf ? store.books.filter((book) => shelf.bookIds.includes(book.localId)) : [...store.books] // Use a copy to avoid mutating the original store
    //
    //     return books.sort((a, b) => {
    //         const dateA = new Date(store.sort === "byCreationDate" ? a.createdAt : a.updatedAt).getTime()
    //         const dateB = new Date(store.sort === "byCreationDate" ? b.createdAt : b.updatedAt).getTime()
    //         return store.dir === "asc" ? dateA - dateB : dateB - dateA
    //     })
    // })

    // TODO: only generate the url of covers that changed
    const generateAndSetCoverUrls = () => {
        Object.values(store.coverUrls).forEach(URL.revokeObjectURL)

        const coverMap: Record<number, string> = {}
        store.books.forEach((book) => {
            if (book.coverImage) {
                const url = URL.createObjectURL(book.coverImage.blob)
                coverMap[book.localId] = url
            }
        })
        setStore("coverUrls", coverMap)
    }

    // Load and sort books on mount
    onMount(() => {
        // -- Dexie reactive data
        const booksSub = liveQuery(() => LumiDb.getAllLightBooks()).subscribe((books) => {
            setStore("books", reconcile(books || []))
            generateAndSetCoverUrls()
        })

        const shelvesSub = liveQuery(() => LumiDb.getAllBookshelves()).subscribe((shelves) =>
            setStore("shelves", reconcile(shelves || [])),
        )

        // -- bfcache restores (handle invalid cover blobs)
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) generateAndSetCoverUrls()
        }
        window.addEventListener("pageshow", handlePageShow)

        onCleanup(() => {
            booksSub.unsubscribe()
            shelvesSub.unsubscribe()
            window.removeEventListener("pageshow", handlePageShow)
            Object.values(store.coverUrls).forEach(URL.revokeObjectURL)
        })
    })

    const createBook = async (files: File[]) => {
        for (const file of files) {
            if (!file.type.includes("epub") && !file.name.endsWith(".epub")) continue
            // TODO: find a better way and that doesnt need to call deinit
            const book = await EpubBook.fromFile(file)
            book.deinit()
        }
    }

    const deleteBook = async (localId: number) => {
        await LumiDb.deleteBookById(localId)
    }

    // Creates a new shelf
    // Updates both the local store and persists the changes to the database.
    const createShelf = async (name: string) => {
        await LumiDb.createBookShelf(name)
    }

    // Deletes an existing shelf
    // Updates both the local store and persists the changes to the database.
    const deleteShelf = async (shelfId: number) => {
        await LumiDb.deleteBookshelfById(shelfId)
    }

    // Renames a shelf
    // Updates both the local store and persists the changes to the database.
    const renameShelf = async (shelfId: number, name: string) => {
        const shelf = store.shelves.find((s) => s.id === shelfId)
        if (shelf) {
            await LumiDb.updateBookshelf({ ...shelf, name })
        }
    }

    // Toggles the presence of a book in a specific shelf.
    // Updates both the local store and persists the changes to the database.
    const toggleBookInShelf = async (shelfId: number, bookId: number) => {
        const shelf = store.shelves.find((s) => s.id === shelfId)
        if (!shelf) return

        if (shelf.bookIds.includes(bookId)) {
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
