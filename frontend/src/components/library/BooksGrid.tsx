import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js"
import { ReaderSourceLightRecord } from "@/lib/db"
import { useLibraryContext } from "@/context/library"
import BookCard from "./BookCard"

// Detects if the device is touch-capable for UI adaptation.
// This hook is called on every resize event
function useTouchDetection() {
    const [isTouch, setIsTouch] = createSignal(false)
    const checkTouch = () => setIsTouch(window.matchMedia("(pointer: coarse)").matches)

    onMount(() => {
        checkTouch()
        window.addEventListener("resize", checkTouch)
        onCleanup(() => window.removeEventListener("resize", checkTouch))
    })

    return isTouch
}

// Main grid for displaying all books.
export default function BooksGrid() {
    const { state } = useLibraryContext()

    // Track which book is hovered/touched.
    const [hoveredBookId, setHoveredBookId] = createSignal<number | null>(null)
    const isTouch = useTouchDetection()

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
        if (isTouch()) {
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
                        hoveredBookId={hoveredBookId}
                        setHoveredBookId={setHoveredBookId}
                        isTouch={isTouch}
                        handleBookClick={handleBookClick}
                    />
                )}
            </For>
        </div>
    )
}
