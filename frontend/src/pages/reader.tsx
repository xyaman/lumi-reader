import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { ReaderProvider } from "@/context/reader"
import { EpubBook } from "@/lib/epub"

import ReaderNavbar from "@/components/reader/ReaderNavbar"
import { SettingsSidebar, ReaderLeftSidebar } from "@/components/reader/ReaderSidebar"
import ReaderContent from "@/components/reader/ReaderContent"
import { LumiDb } from "@/lib/db"
import { ReaderSource } from "@/lib/readerSource"
import { UserActivityManager } from "@/services/userPresence"
import { CharacterCounter, KeymapManager } from "@/components/reader"

/**
 * BookReader component for displaying and managing the reading experience of an EPUB book.
 *
 * - Retrieves the book ID from the route parameters.
 * - Loads the corresponding book record asynchronously on mount.
 * - Redirects to the home page if the book is not found or the ID is invalid.
 * - Cleans up any created object URLs and temporary CSS on unmount.
 * - Provides the loaded book to child components via ReaderProvider.
 * - Renders the reader navigation bar, sidebars, and main content.
 *
 * @returns {JSX.Element} The reader UI if the book is loaded, otherwise a loading message.
 */
export function BookReader(): JSX.Element {
    const params = useParams()
    const id = Number(params.id)

    const navigate = useNavigate()
    if (!id) navigate("/", { replace: true })

    // -- signals
    const [currBook, setCurrBook] = createSignal<ReaderSource | null>(null)

    // -- helper functions used in effects and onMount
    let interval: number | null = null
    const initializeReader = async (source: ReaderSource) => {
        setCurrBook(source)

        const bookStyle = source.getCssStyle()
        bookStyle.id = "book-css"
        document.head.appendChild(bookStyle)
        document.documentElement.lang = source.language

        // NOTE: if user is offline or unauthenticated, the
        // function is called, but it won't execute the fetch
        UserActivityManager.setPresence("reading", source.title)
        interval = setInterval(() => {
            UserActivityManager.setPresence("reading", source.title)
        }, 30000)
    }

    onMount(async () => {
        const record = await LumiDb.getBookById(id)
        if (!record) {
            navigate("/", { replace: true })
            return
        }

        // everything is ok, well start reading
        if (record.kind === "epub") {
            const book = EpubBook.fromReaderSourceRecord(record)
            initializeReader(book)
        } else {
            navigate("/", { replace: true })
            return
        }
    })

    onCleanup(() => {
        currBook()?.deinit()
        document.head.querySelector("#book-css")?.remove()
        document.documentElement.removeAttribute("lang")
        if (interval) clearInterval(interval)
    })

    return (
        <Show when={currBook()} fallback={<p>Loading book...</p>}>
            <ReaderProvider book={currBook()!}>
                <KeymapManager />

                <ReaderNavbar />
                <ReaderLeftSidebar />
                <SettingsSidebar />
                <CharacterCounter />
                <ReaderContent />
            </ReaderProvider>
        </Show>
    )
}
