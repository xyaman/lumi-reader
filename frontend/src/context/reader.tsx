import { Bookmark, ReaderSource } from "@/lib/readerSource"
import ReadingSessionManager from "@/services/readingSessionManager"
import { createContext, JSX, onCleanup, useContext } from "solid-js"
import { createStore, SetStoreFunction } from "solid-js/store"

/**
 * State for the reader UI.
 */
interface ReaderStore {
    // reader related
    shouldReload: boolean
    navOpen: boolean
    sideBar: "toc" | "bookmarks" | "settings" | "session" | null

    // book related
    book: ReaderSource
    currIndex: number
    currChars: number
    currSection: number
}

const initialState: Omit<ReaderStore, "book"> = {
    // reader related
    shouldReload: false,
    navOpen: false,
    sideBar: null,

    // book related
    currIndex: 0,
    currChars: 0,
    currSection: 0,
}

type ReaderContextType = {
    updateChars: (isPaginated: boolean, isVertical: boolean) => number
    navigationGoTo: (file: string) => void
    bookmarkGoTo: (bookmark: Bookmark) => void
    readerStore: ReaderStore
    setReaderStore: SetStoreFunction<ReaderStore>
    readingManager: ReadingSessionManager
}

const ReaderContext = createContext<ReaderContextType>()
const LS_AUTOMATICSTART = "reader:sessions:automaticstart"

/**
 * Provides the reader context to its children.
 * @param props - Contains the book and children components.
 */
export function ReaderProvider(props: { book: ReaderSource; children: JSX.Element }) {
    const [readerStore, setReaderStore] = createStore({
        ...initialState,
        book: props.book,
        currSection: props.book.findSectionIndex(props.book.currParagraph) ?? 0,
    })

    const readingManager = new ReadingSessionManager()

    const automaticStart = localStorage.getItem(LS_AUTOMATICSTART)
        ? localStorage.getItem(LS_AUTOMATICSTART) === "true"
        : true
    if (automaticStart) readingManager.startSession(props.book)

    const updateChars = (isPaginated: boolean, isVertical: boolean) => {
        let lastIndex = props.book.currParagraph
        let currChars = props.book.currChars
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
        props.book.currParagraph = lastIndex
        props.book.currChars = currChars
        props.book.save().catch(console.error)

        // update store state
        setReaderStore("currIndex", lastIndex)
        setReaderStore("currChars", currChars)

        readingManager.updateReadingProgress(currChars).then(() => console.log("progress updated"))

        return lastIndex
    }

    onCleanup(() => readingManager.finishSession())

    const bookmarkGoTo = (bookmark: Bookmark) => {
        const sectionId = readerStore.book.findSectionIndexById(bookmark.sectionName)
        if (readerStore.currSection !== sectionId && sectionId) {
            setReaderStore("currSection", sectionId)
        }

        setTimeout(() => {
            document
                .querySelector(`p[index="${bookmark.paragraphId}"]`)
                ?.scrollIntoView({ block: "center" })
        }, 0)
    }
    const navigationGoTo = (name: string) => {
        const section = readerStore.book.sections[readerStore.currSection]
        const currentFile = section.name

        if (currentFile !== name) {
            const sectionId = readerStore.book.sections.findIndex(
                (section) => section.name === name,
            )!
            setReaderStore("currSection", sectionId)
        }

        setTimeout(() => {
            document.getElementById(name)?.scrollIntoView({ block: "center" })
        }, 0)
    }

    return (
        <ReaderContext.Provider
            value={{
                updateChars,
                navigationGoTo,
                bookmarkGoTo,
                readerStore,
                setReaderStore,
                readingManager,
            }}
        >
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
