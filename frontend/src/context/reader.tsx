import { EpubBook, IBookmark } from "@/lib/epub"
import { createContext, JSX, useContext } from "solid-js"
import { createStore, SetStoreFunction } from "solid-js/store"

/**
 * State for the reader UI.
 */
interface ReaderStore {
    shouldReload: boolean
    navOpen: boolean
    sideBar: "toc" | "bookmarks" | "settings" | null

    // book related
    book: EpubBook
    currIndex: number
    currChars: number
    currSection: number
}

const initialState: Omit<ReaderStore, "book"> = {
    navOpen: false,
    shouldReload: false,
    sideBar: null,
    currIndex: 0,
    currChars: 0,
    currSection: 0,
}

type ReaderContextType = {
    updateChars: (isPaginated: boolean, isVertical: boolean) => number
    bookmarkGoTo: (bookmark: IBookmark) => void
    readerStore: ReaderStore
    setReaderStore: SetStoreFunction<ReaderStore>
}

const ReaderContext = createContext<ReaderContextType>()

/**
 * Provides the reader context to its children.
 * @param props - Contains the book and children components.
 */
export function ReaderProvider(props: { book: EpubBook; children: JSX.Element }) {
    const [readerStore, setReaderStore] = createStore({
        ...initialState,
        book: props.book,
        currSection: props.book.findSectionIndex(props.book.currParagraphId),
    })

    const updateChars = (isPaginated: boolean, isVertical: boolean) => {
        let lastIndex = 0
        let currChars = 0
        const pTags = document.querySelectorAll("p[index]")
        for (let i = 0; i < pTags.length; i++) {
            const rect = pTags[i].getBoundingClientRect()

            lastIndex = Number(pTags[i].getAttribute("index")) ?? lastIndex
            currChars = Number(pTags[i].getAttribute("characumm")) ?? currChars

            // stop if it is visible
            if (
                (!isPaginated && !isVertical && rect.bottom > 0) ||
                (!isPaginated && isVertical && rect.x < 0) ||
                (isPaginated && !isVertical && rect.x > 0) ||
                (isPaginated && isVertical && rect.y > 0)
            )
                break
        }

        // update localstorage book
        props.book.currParagraphId = lastIndex
        props.book.currChars = currChars
        props.book.save().catch(console.error)

        // update store state
        setReaderStore("currIndex", lastIndex)
        setReaderStore("currChars", currChars)

        return lastIndex
    }

    const bookmarkGoTo = (bookmark: IBookmark) => {
        const sectionId = readerStore.book.findSectionIndex(bookmark.paragraphId)
        if (readerStore.currSection !== sectionId) {
            setReaderStore("currSection", sectionId)
        }

        setTimeout(() => {
            document
                .querySelector(`p[index="${bookmark.paragraphId}"]`)
                ?.scrollIntoView({ block: "center" })
        }, 0)
    }
    const navigationGoTo = (bookmarkIndex: number) => {}

    return (
        <ReaderContext.Provider value={{ updateChars, bookmarkGoTo, readerStore, setReaderStore }}>
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
