import { createContext, JSX, onCleanup, onMount, useContext } from "solid-js"
import { createStore } from "solid-js/store"
import { Bookmark, ReaderSource } from "@/lib/readerSource"
import ReadingSessionManager from "@/services/readingSession"
import { lsReadingSessions } from "@/services/localStorage"

type ReaderState = {
    shouldReload: boolean
    navOpen: boolean
    sideBar: "toc" | "bookmarks" | "settings" | "session" | null

    // book related
    book: ReaderSource
    currIndex: number
    currChars: number
    currSection: number
}

type ReaderDispatch = {
    updateChars: (isPaginated: boolean, isVertical: boolean) => number
    navigationGoTo: (file: string) => void
    bookmarkGoTo: (bookmark: Bookmark) => void
    openNavbar: () => void
    closeNavbar: () => void
    setSidebar: (value: string | null) => void

    goToNextSection: () => void
    goToPrevSection: () => number
    setSection: (section: number) => void
}

const BookStateContext = createContext<ReaderState>()
const BookDispatchContext = createContext<ReaderDispatch>()

export function ReaderProvider(props: { book: ReaderSource; children: JSX.Element }) {
    const [store, setStore] = createStore<ReaderState>({
        shouldReload: false,
        navOpen: false,
        sideBar: null,
        currIndex: 0,
        book: props.book,
        currSection: props.book.findSectionIndex(props.book.currParagraph) ?? 0,
        currChars: props.book.currChars,
    })

    onMount(() => {
        if (lsReadingSessions.autoStart()) {
            ReadingSessionManager.getInstance().startReading(props.book)
        }

        onCleanup(() => {
            ReadingSessionManager.getInstance().updateProgress(props.book.currChars)
            ReadingSessionManager.getInstance().endReading()
        })
    })

    /**
     * Updates the current paragraph and character count based on visible content.
     * Also persists the progress to local storage.
     * @param isPaginated - Whether the reader is in paginated mode.
     * @param isVertical - Whether the reader is in vertical mode.
     * @returns The index of the last visible paragraph.
     */
    const updateChars = (isPaginated: boolean, isVertical: boolean) => {
        let lastIndex = 0
        let currChars = 0
        const pTags = document.querySelectorAll("p[index], img[index], image[index]")
        for (let i = 0; i < pTags.length; i++) {
            const rect = pTags[i].getBoundingClientRect()

            lastIndex = Number(pTags[i].getAttribute("index")) ?? lastIndex
            currChars = Number(pTags[i].getAttribute("characumm")) ?? currChars

            // stop if it is visible
            if (
                (!isPaginated && !isVertical && rect.bottom > 0) ||
                (!isPaginated && isVertical && rect.x < window.innerWidth) ||
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
        setStore("currIndex", lastIndex)
        setStore("currChars", currChars)

        ReadingSessionManager.getInstance().updateProgress(currChars)
        return lastIndex
    }

    /**
     * Navigates to a specific section by its file name and scrolls it into view.
     * @param name - The file name of the section to navigate to.
     */
    const navigationGoTo = (name: string) => {
        const section = store.book.sections[store.currSection]
        const currentFile = section.name

        if (currentFile !== name) {
            const sectionId = store.book.sections.findIndex((section) => section.name === name)!
            setStore("currSection", sectionId)
        }

        // TODO: find a better way and dont use timeout to wait for the render
        setTimeout(() => {
            document.getElementById(name)?.scrollIntoView({ block: "center" })
        }, 0)
    }

    /**
     * Navigates to a specific bookmark and scrolls the corresponding paragraph into view.
     * @param bookmark - The bookmark object containing section and paragraph info.
     */
    const bookmarkGoTo = (bookmark: Bookmark) => {
        const sectionId = store.book.findSectionIndexById(bookmark.sectionName)
        if (store.currSection !== sectionId && sectionId) {
            setStore("currSection", sectionId)
        }

        // TODO: find a better way and dont use timeout to wait for the render
        setTimeout(() => {
            document.querySelector(`p[index="${bookmark.paragraphId}"]`)?.scrollIntoView({ block: "center" })
        }, 0)
    }

    const openNavbar = () => {
        setStore("navOpen", true)
        setStore("sideBar", null)
    }

    const closeNavbar = () => {
        setStore("navOpen", false)
        setStore("sideBar", null)
    }

    const setSidebar = (value: string | null) => setStore("sideBar", value as any)

    const goToNextSection = () => {
        setStore("currSection", store.currSection + 1)
    }

    const goToPrevSection = () => {
        setStore("currSection", store.currSection - 1)
        return store.book.sections[store.currSection].lastIndex - 1
    }

    const setSection = (section: number) => {
        setStore("currSection", section)
    }

    return (
        <BookStateContext.Provider value={store}>
            <BookDispatchContext.Provider
                value={{
                    updateChars,
                    navigationGoTo,
                    bookmarkGoTo,
                    openNavbar,
                    closeNavbar,
                    setSidebar,
                    goToNextSection,
                    goToPrevSection,
                    setSection,
                }}
            >
                {props.children}
            </BookDispatchContext.Provider>
        </BookStateContext.Provider>
    )
}

export function useReaderState() {
    const ctx = useContext(BookStateContext)
    if (!ctx) throw new Error("useReaderState must be used inside <ReaderProvider>")
    return ctx
}

export function useReaderDispatch() {
    const ctx = useContext(BookDispatchContext)
    if (!ctx) throw new Error("useReaderDispatch must be used inside <ReaderProvider>")
    return ctx
}
