import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { ReaderProvider, useReaderContext } from "@/context/reader"
import { EpubBook, getBaseName } from "@/lib/epub"

import ReaderNavbar from "./components/ReaderNavbar"
import { SettingsSidebar, ReaderLeftSidebar } from "./components/ReaderSidebar"
import ReaderContent from "./components/ReaderContent"

function CharacterCounter() {
    const { readerStore } = useReaderContext()
    const currPercentage = () =>
        ((100 * readerStore.currChars) / readerStore.book.totalChars).toFixed(2)

    return (
        <span class="z-10 right-[0.5rem] bottom-[0.5rem] fixed text-[0.75rem]">
            {readerStore.currChars}/{readerStore.book.totalChars} ({currPercentage()}%)
        </span>
    )
}

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
export default function BookReader(): JSX.Element {
    const params = useParams()
    const id = Number(params.id)

    const navigate = useNavigate()
    if (!id) navigate("/", { replace: true })

    const [currBook, setCurrBook] = createSignal<EpubBook | null>(null)
    onMount(async () => {
        const record = await EpubBook.getById(id)
        if (!record) {
            navigate("/", { replace: true })
            return
        }
        const book = EpubBook.fromRecord(record)
        setCurrBook(book)

        book.insertCss()

        // setup images
        if (Object.keys(book.blobs).length === 0) {
            for (let i = 0; i < book.manifest.imgs.length; i++) {
                const imgFilename = getBaseName(book.manifest.imgs[i].filename)!
                const url = URL.createObjectURL(book.manifest.imgs[i].blob)
                book.blobs[imgFilename] = url
            }
        }
    })

    onCleanup(() => {
        // currBook()?.cleanUp()
        const blobs = currBook()?.blobs
        if (!blobs) return
        Object.values(blobs).forEach((url) => URL.revokeObjectURL(url))
        document.head.querySelectorAll("#temp-css").forEach((el) => el.remove())
    })

    return (
        <Show when={currBook()} fallback={<p>Loading book...</p>}>
            <ReaderProvider book={currBook()!}>
                <ReaderNavbar />
                <ReaderLeftSidebar />
                <SettingsSidebar />
                <CharacterCounter />
                <ReaderContent />
            </ReaderProvider>
        </Show>
    )
}
