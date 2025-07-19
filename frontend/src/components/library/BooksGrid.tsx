import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js"
import { ReaderSourceLightRecord } from "@/lib/db"
import { useLibraryContext } from "@/context/library"
import BookCard from "./BookCard"
import { isTouchDevice } from "@/lib/utils"

// Main grid for displaying all books.
export default function BooksGrid() {
    const { state } = useLibraryContext()

    // Track which book is hovered/touched.
    const [hoveredBookId, setHoveredBookId] = createSignal<number | null>(null)
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

    // Filter books by active shelf if set.
    const visibleBooks = createMemo(() => {
        if (!state.activeShelf) return state.books
        return state.books.filter((book) =>
            state.shelves
                .find((shelf) => shelf.id === state.activeShelf)
                ?.bookIds.includes(book.localId),
        )
    })

    return (
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <For each={visibleBooks()}>
                {(book) => (
                    <BookCard
                        book={book}
                        hovered={hoveredBookId() === book.localId}
                        onClick={(e) => handleBookClick(e, book)}
                    />
                )}
            </For>
        </div>
    )
}
