import {
    createContext,
    useContext,
    JSX,
    onMount,
    createEffect,
    on,
    onCleanup,
    batch,
} from "solid-js"
import { createStore, SetStoreFunction } from "solid-js/store"
import { LumiDb, ReaderSourceLightRecord } from "@/lib/db"

// LocalStorage keys
const LS_KEYS = {
    SORT: "library:sortBy",
    DIR: "library:direction",
} as const

type SortField = "updatedAt" | "createdAt"
type SortDirection = "asc" | "desc"
type Shelf = { id: number; name: string; bookIds: number[] }

interface ILibraryStore {
    books: ReaderSourceLightRecord[]
    shelves: Shelf[]
    activeShelf: number | null
    covers: Record<number, string>
    sort: SortField
    dir: SortDirection
}

interface ILibraryContext {
    state: ILibraryStore
    setState: SetStoreFunction<ILibraryStore>
    setSortParams: (sort?: SortField, dir?: SortDirection) => void
    addShelf: (name: string) => Promise<void>
    removeShelf: (shelfId: number) => Promise<void>
    renameShelf: (shelfId: number, name: string) => Promise<void>
    toggleBookInShelf: (shelfId: number, bookId: number) => Promise<void>
}

const LibraryContext = createContext<ILibraryContext>({
    state: {
        books: [],
        shelves: [],
        activeShelf: null,
        covers: {},
        sort: "updatedAt",
        dir: "desc",
    },
    setState: () => {},
    setSortParams: () => {},
    addShelf: async () => {},
    removeShelf: async () => {},
    renameShelf: async () => {},
    toggleBookInShelf: async () => {},
})

function sortBooks(books: ReaderSourceLightRecord[], sort: SortField, dir: SortDirection) {
    const direction = dir === "desc" ? -1 : 1
    return [...books].sort((a, b) => ((a[sort] ?? 0) - (b[sort] ?? 0)) * direction)
}

export function LibraryProvider(props: { children: JSX.Element }) {
    const [state, setState] = createStore<ILibraryStore>({
        books: [],
        shelves: [],
        covers: {},
        activeShelf: null,
        sort: (localStorage.getItem(LS_KEYS.SORT) as SortField) ?? "updatedAt",
        dir: (localStorage.getItem(LS_KEYS.DIR) as SortDirection) ?? "desc",
    })

    // Load and **sort** books on mount
    onMount(async () => {
        const [books, shelves] = await Promise.all([
            LumiDb.getAllLightBooks(),
            LumiDb.getAllBookshelves(),
        ])
        setState("books", books)
        setState("shelves", shelves)
    })

    // Update books if:
    // - Sort related state changed
    // - Books lenght changed
    createEffect(
        on([() => state.sort, () => state.dir, () => state.books.length], ([sort, dir]) => {
            if (state.books.length === 0) return

            const sortedBooks = sortBooks(state.books, sort, dir)

            // Only update if the order has actually changed
            const hasChanged = sortedBooks.some(
                (book, index) => book.localId !== state.books[index].localId,
            )
            if (hasChanged) {
                setState("books", sortedBooks)
            }
        }),
    )

    // Handle cover images and remove URL blobs on unMount
    createEffect(() => {
        const coverMap: Record<number, string> = {}
        const urls: string[] = []

        state.books.forEach((book) => {
            if (book.coverImage) {
                const url = URL.createObjectURL(book.coverImage.blob)
                coverMap[book.localId] = url
                urls.push(url)
            }
        })

        setState("covers", coverMap)
        onCleanup(() => urls.forEach(URL.revokeObjectURL))
    })

    // Save sort preferences
    createEffect(
        on([() => state.sort, () => state.dir], ([sort, dir]) => {
            localStorage.setItem(LS_KEYS.SORT, sort)
            localStorage.setItem(LS_KEYS.DIR, dir)
        }),
    )

    // Helpers
    const setSortParams = (sort?: SortField, dir?: SortDirection) => {
        batch(() => {
            if (sort) setState("sort", sort)
            if (dir) setState("dir", dir)
        })
    }

    // Add shelf
    const addShelf = async (name: string) => {
        const shelf = await LumiDb.createBookShelf(name)
        setState("shelves", (shelves) => [...shelves, shelf])
    }

    // Remove shelf
    const removeShelf = async (shelfId: number) => {
        await LumiDb.deleteBookshelfById(shelfId)
        setState("shelves", (shelves) => shelves.filter((s) => s.id !== shelfId))
    }

    // Rename shelf
    const renameShelf = async (shelfId: number, name: string) => {
        const shelf = state.shelves.find((s) => s.id === shelfId)
        if (!shelf) return

        await LumiDb.updateBookshelf({
            id: shelfId,
            name,
            bookIds: shelf.bookIds,
        })
        setState("shelves", (shelves) =>
            shelves.map((s) => (s.id === shelfId ? { ...s, name } : s)),
        )
    }

    // Toggle book in shelf
    const toggleBookInShelf = async (shelfId: number, bookId: number) => {
        const shelf = state.shelves.find((s) => s.id === shelfId)
        if (!shelf) return

        const exists = shelf.bookIds.includes(bookId)
        if (exists) {
            await LumiDb.removeBookFromShelf(shelfId, bookId)
            setState("shelves", (shelves) =>
                shelves.map((s) =>
                    s.id === shelfId
                        ? { ...s, bookIds: s.bookIds.filter((id) => id !== bookId) }
                        : s,
                ),
            )
        } else {
            await LumiDb.addBookToShelf(shelfId, bookId)
            setState("shelves", (shelves) =>
                shelves.map((s) =>
                    s.id === shelfId ? { ...s, bookIds: [...s.bookIds, bookId] } : s,
                ),
            )
        }
    }

    const contextValue: ILibraryContext = {
        state,
        setState,
        setSortParams,
        addShelf,
        removeShelf,
        renameShelf,
        toggleBookInShelf,
    }

    return <LibraryContext.Provider value={contextValue}>{props.children}</LibraryContext.Provider>
}

export function useLibraryContext() {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error("useLibraryContext must be used inside <LibraryProvider>")
    return ctx
}
