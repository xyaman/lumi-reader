import { createSignal, For, onCleanup, onMount } from "solid-js"
import { ReaderSourceLightRecord } from "@/db"
import { isTouchDevice } from "@/lib/utils"
import { useLibraryState } from "@/context/library"
import { BookCard, BookshelfModal } from "@/components/home/library"

// Main grid for displaying all books.
export function BooksGrid() {
    const libraryState = useLibraryState()

    // Track which book is hovered/touched.
    const [hoveredBookId, setHoveredBookId] = createSignal<number | null>(null)

    // Track modal content
    const [modalBook, setModalBook] = createSignal<ReaderSourceLightRecord | null>(null)

    const isTouch = isTouchDevice()

    // Hide actions when clicking outside any book card.
    onMount(() => {
        const handleDocClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest(".book-card")) {
                setHoveredBookId(null)
            }
        }
        document.addEventListener("click", handleDocClick)
        onCleanup(() => document.removeEventListener("click", handleDocClick))
    })

    // Handle tap/click on book for touch devices.
    const handleBookClick = (e: MouseEvent, book: ReaderSourceLightRecord) => {
        if (isTouch) {
            if (hoveredBookId() !== book.localId) {
                e.preventDefault()
                setHoveredBookId(book.localId)
            } else {
                setHoveredBookId(null)
            }
        }
    }

    return (
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <For each={libraryState.displayedBooks}>
                {(book) => (
                    <BookCard
                        book={book}
                        hovered={isTouch && hoveredBookId() === book.localId}
                        onInfoClick={() => setModalBook(book)}
                        onClick={(e) => handleBookClick(e, book)}
                    />
                )}
            </For>

            <BookshelfModal book={modalBook()} onDismiss={() => setModalBook(null)} />
        </div>
    )
}
