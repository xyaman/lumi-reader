import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { ReaderProvider, useReaderContext } from "@/context/reader"
import { EpubBook } from "@/lib/epub"

import ReaderNavbar from "./components/ReaderNavbar"
import { SettingsSidebar, ReaderLeftSidebar } from "./components/ReaderSidebar"
import ReaderContent from "./components/ReaderContent"
import { ReaderSourceDB } from "./lib/db"

// CharacterCounter toggles visibility on click, always clickable
function CharacterCounter() {
    const [show, setShow] = createSignal(true)
    const { readerStore } = useReaderContext()
    const currPercentage = () =>
        ((100 * readerStore.currChars) / readerStore.book.totalChars).toFixed(2)

    return (
        <span
            class="z-10 right-[0.5rem] bottom-[0.5rem] fixed text-[0.75rem] cursor-pointer"
            onClick={() => setShow((prev) => !prev)}
        >
            {show() ? (
                `${readerStore.currChars}/${readerStore.book.totalChars} (${currPercentage()}%)`
            ) : (
                <span class="opacity-20">Show counter</span>
            )}
        </span>
    )
}

function GlobalKeymapManager() {
    const [modalOpen, setModalOpen] = createSignal(false)
    const { bookmarkGoTo, readerStore } = useReaderContext()

    const keymaps = [
        {
            key: "?",
            description: "Show keymap help",
            action: () => setModalOpen(true),
        },
        {
            key: "b",
            description: "Go to last saved bookmark",
            action: () => {
                const bookmarks = readerStore.book.bookmarks
                if (bookmarks.length === 0) return
                bookmarkGoTo(bookmarks[bookmarks.length - 1])
            },
        },
    ]

    function handleKeydown(e: KeyboardEvent) {
        for (const km of keymaps) {
            if (e.key === km.key) {
                e.preventDefault()
                km.action()
                break
            }
        }
        if (e.key === "Escape" && modalOpen()) setModalOpen(false)
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown)
    })
    onCleanup(() => {
        window.removeEventListener("keydown", handleKeydown)
    })

    return (
        <Show when={modalOpen()}>
            <div
                class="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
                onClick={() => setModalOpen(false)}
            >
                <div
                    class="rounded p-6 min-w-[300px] shadow-lg bg-(--base01) text-(--base05)"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h4 class="mb-4 font-bold text-lg text-(--base0D)">Keyboard Shortcuts</h4>
                    <ul>
                        {keymaps.map((km) => (
                            <li class="mb-2 flex items-center">
                                <span class="font-mono px-2 py-1 rounded bg-(--base02) text-(--base0B)">
                                    {km.key}
                                </span>
                                <span class="ml-2">{km.description}</span>
                            </li>
                        ))}
                    </ul>
                    <button
                        class="button-theme rounded mt-4 px-4 py-2"
                        onClick={() => setModalOpen(false)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Show>
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
        const record = await ReaderSourceDB.getBookById(id)
        if (!record) {
            navigate("/", { replace: true })
            return
        }

        if (record.kind === "epub") {
            const book = EpubBook.fromReaderSourceRecord(record)
            setCurrBook(book)

            const bookStyle = book.getCssStyle()
            bookStyle.id = "book-css"
            document.head.appendChild(bookStyle)
            document.documentElement.lang = book.language
        } else {
            navigate("/", { replace: true })
            return
        }
    })

    onCleanup(() => {
        currBook()?.deinit()
        document.head.querySelector("#book-css")?.remove()
        document.documentElement.removeAttribute("lang")
    })

    return (
        <Show when={currBook()} fallback={<p>Loading book...</p>}>
            <ReaderProvider book={currBook()!}>
                <GlobalKeymapManager />

                <ReaderNavbar />
                <ReaderLeftSidebar />
                <SettingsSidebar />
                <CharacterCounter />
                <ReaderContent />
            </ReaderProvider>
        </Show>
    )
}
