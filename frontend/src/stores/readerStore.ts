import type { EpubBook } from "@/lib/epub"
import { createStore } from "solid-js/store"

interface ReaderStore {
    currBook: EpubBook | null
    navOpen: boolean
    sideLeft: "toc" | "bookmarks" | null
    settingsOpen: boolean
    isPaginated: boolean
    isVertical: boolean
}

const initialState: ReaderStore = {
    currBook: null,
    navOpen: false,
    sideLeft: null,
    settingsOpen: false,
    isPaginated: localStorage.getItem("reader:paginated") === "true",
    isVertical: localStorage.getItem("reader:vertical") === "true",
}

export const [readerStore, setReaderStore] = createStore(initialState)
