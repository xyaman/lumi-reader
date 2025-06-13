import { EpubBook } from "@/lib/epub"
import { createContext, JSX, useContext } from "solid-js"
import { createStore, SetStoreFunction } from "solid-js/store"

/**
 * State for the reader UI.
 */
interface ReaderStore {
    shouldReload: boolean
    navOpen: boolean
    sideBar: "toc" | "bookmarks" | "settings" | null
}

const initialState: ReaderStore = {
    navOpen: false,
    shouldReload: false,
    sideBar: null,
}

type ReaderContextType = {
    book: EpubBook
    readerStore: ReaderStore
    setReaderStore: SetStoreFunction<ReaderStore>
}

const ReaderContext = createContext<ReaderContextType>()

/**
 * Provides the reader context to its children.
 * @param props - Contains the book and children components.
 */
export function ReaderProvider(props: { book: EpubBook; children: JSX.Element }) {
    const [readerStore, setReaderStore] = createStore(initialState)

    return (
        <ReaderContext.Provider value={{ book: props.book, readerStore, setReaderStore }}>
            {props.children}
        </ReaderContext.Provider>
    )
}

/**
 * Hook to access the reader context.
 * @throws Error if used outside of ReaderProvider.
 */
export function useReaderContext() {
    const ctx = useContext(ReaderContext)
    if (!ctx) throw new Error("useReaderContext must be used inside <ReaderProvider>")
    return ctx
}
