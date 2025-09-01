// src/stores/library.ts
import { batch, createMemo, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { liveQuery } from "dexie"
import { LumiDb, ReaderSourceLightRecord } from "@/db"

import { EpubBook } from "@/lib/epub"

// Keep types here, or move to a central `types.ts` file
type SortField = "byLastUpdate" | "byCreationDate"
type SortDirection = "asc" | "desc"
type Shelf = { id: number; name: string; bookIds: number[] }

type LibraryState = {
    // Raw data from the database
    books: ReaderSourceLightRecord[]

    shelves: Shelf[]

    // User settings

    activeShelfId: number | null
    sort: SortField

    dir: SortDirection
}

// All actions now just interact with the database.
// liveQuery will handle updating the state automatically.
type LibraryActions = {
    createBook: (files: File[]) => Promise<void>
    deleteBook: (localId: number) => Promise<void>
    createShelf: (name: string) => Promise<void>
    deleteShelf: (shelfId: number) => Promise<void>
    renameShelf: (shelfId: number, name: string) => Promise<void>
    setActiveShelf: (shelfId: number | null) => void
    toggleBookInShelf: (shelfId: number, bookId: number) => Promise<void>
    setSortParams: (sort?: SortField, dir?: SortDirection) => void
}

// This is our main state management hook
export function createLibraryStore() {
    const [store, setStore] = createStore<LibraryState>({
        books: [],
        shelves: [],
        activeShelfId: null,
        sort: "byLastUpdate",
        dir: "desc",
    })

    // --- REACTIVE DATA SYNC ---
    // Use liveQuery to keep books and shelves in sync with the DB.
    // The store is updated efficiently using `reconcile`.
    const booksSub = liveQuery(() => LumiDb.getAllLightBooks()).subscribe((books) =>
        setStore("books", reconcile(books || [])),
    )
    const shelvesSub = liveQuery(() => LumiDb.getAllBookshelves()).subscribe((shelves) =>
        setStore("shelves", reconcile(shelves || [])),
    )

    // Unsubscribe when the store is no longer needed
    onCleanup(() => {
        booksSub.unsubscribe()
        shelvesSub.unsubscribe()
    })

    // --- DERIVED STATE (MEMOS) ---

    // Memoized cover URLs: only re-calculates when books change.
    const coverUrls = createMemo(() => {
        const urlMap: Record<number, string> = {}
        const urlsToClean: string[] = []
        for (const book of store.books) {
            if (book.coverImage?.blob) {
                const url = URL.createObjectURL(book.coverImage.blob)
                urlMap[book.localId] = url
                urlsToClean.push(url)
            }
        }
        // This effect will re-run when the memo re-evaluates,
        // cleaning up the *previous* set of URLs.
        onCleanup(() => urlsToClean.forEach(URL.revokeObjectURL))
        return urlMap
    })

    // Memoized displayed books: automatically filters and sorts.
    // Components just use this and never have to worry about sorting/filtering logic.
    const displayedBooks = createMemo(() => {
        const shelf = store.activeShelfId ? store.shelves.find((s) => s.id === store.activeShelfId) : null

        const books = shelf ? store.books.filter((book) => shelf.bookIds.includes(book.localId)) : [...store.books] // Use a copy to avoid mutating the original store

        return books.sort((a, b) => {
            const dateA = new Date(store.sort === "byCreationDate" ? a.createdAt : a.updatedAt).getTime()
            const dateB = new Date(store.sort === "byCreationDate" ? b.createdAt : b.updatedAt).getTime()
            return store.dir === "asc" ? dateA - dateB : dateB - dateA
        })
    })

    // --- ACTIONS ---
    // Actions are now much simpler. They only modify the database.
    // The UI updates reactively thanks to liveQuery.

    const actions: LibraryActions = {
        async createBook(files: File[]) {
            for (const file of files) {
                if (!file.type.includes("epub") && !file.name.endsWith(".epub")) continue
                // EpubBook.fromFile should handle saving to the DB
                const book = await EpubBook.fromFile(file)
                book.deinit()
            }
            // No need to call setStore here!
        },
        async deleteBook(localId: number) {
            await LumiDb.deleteBookById(localId)
            // No need to call setStore here!
        },
        async createShelf(name: string) {
            await LumiDb.createBookShelf(name)
        },
        async deleteShelf(shelfId: number) {
            await LumiDb.deleteBookshelfById(shelfId)
        },
        async renameShelf(shelfId: number, name: string) {
            const shelf = store.shelves.find((s) => s.id === shelfId)
            if (shelf) {
                await LumiDb.updateBookshelf({ ...shelf, name })
            }
        },
        async toggleBookInShelf(shelfId: number, bookId: number) {
            const shelf = store.shelves.find((s) => s.id === shelfId)
            if (!shelf) return

            if (shelf.bookIds.includes(bookId)) {
                await LumiDb.removeBookFromShelf(shelfId, bookId)
            } else {
                await LumiDb.addBookToShelf(shelfId, bookId)
            }
        },
        setActiveShelf(shelfId: number | null) {
            setStore("activeShelfId", shelfId)
        },
        setSortParams(sort?: SortField, dir?: SortDirection) {
            batch(() => {
                if (sort) setStore("sort", sort)
                if (dir) setStore("dir", dir)
            })
        },
    }

    return {
        store,
        actions,
        // Expose the derived data directly
        coverUrls,
        displayedBooks,
    }
}
