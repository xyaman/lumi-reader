import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js"
import { IconFolderOpen, IconTrash } from "@/components/icons"
import { LumiDb, ReaderSourceLightRecord } from "@/lib/db"
import { A } from "@solidjs/router"
import { useLibraryContext } from "@/context/library"
import Dialog from "@corvu/dialog"

// Detects if the device is touch-capable for UI adaptation.
function useTouchDetection() {
    const [isTouch, setIsTouch] = createSignal(false)

    onMount(() => {
        const checkTouch = () => setIsTouch(window.matchMedia("(pointer: coarse)").matches)
        checkTouch()
        window.addEventListener("resize", checkTouch)
        onCleanup(() => window.removeEventListener("resize", checkTouch))
    })

    return isTouch
}

// Dialog for adding/removing a book to/from bookshelves.
function BookshelfDialog(props: {
    book: ReaderSourceLightRecord
    hoveredBookId: () => number | null
    isTouch: () => boolean
}) {
    const { state, setState } = useLibraryContext()
    // Only show dialog trigger for the hovered/touched book.
    const isVisible = () => (props.isTouch() ? props.hoveredBookId() === props.book.localId : false)

    const [selectedShelves, setSelectedShelves] = createSignal(new Set<number>())

    // Initialize checked shelves for the book.
    const initializeSelectedShelves = () => {
        const bookShelves = state.shelves
            .filter((shelf) => shelf.bookIds.includes(props.book.localId))
            .map((shelf) => shelf.id)
        setSelectedShelves(new Set(bookShelves))
    }

    // Toggle shelf selection.
    const handleShelfToggle = (shelfId: number, checked: boolean) => {
        const newSelected = new Set(selectedShelves())
        if (checked) {
            newSelected.add(shelfId)
        } else {
            newSelected.delete(shelfId)
        }
        setSelectedShelves(newSelected)
    }

    // Save shelf changes to DB and state.
    const handleSave = async () => {
        const selected = selectedShelves()
        const currentShelves = state.shelves.filter((shelf) =>
            shelf.bookIds.includes(props.book.localId),
        )

        for (const shelf of currentShelves) {
            if (!selected.has(shelf.id)) {
                await LumiDb.removeBookFromShelf(props.book.localId, shelf.id)
            }
        }

        for (const shelfId of selected) {
            const shelf = state.shelves.find((s) => s.id === shelfId)
            if (shelf && !shelf.bookIds.includes(props.book.localId)) {
                await LumiDb.addBookToShelf(props.book.localId, shelfId)
            }
        }

        // Update shelves in state.
        const updatedShelves = state.shelves.map((shelf) => {
            const shouldInclude = selected.has(shelf.id)
            const currentlyIncludes = shelf.bookIds.includes(props.book.localId)

            if (shouldInclude && !currentlyIncludes) {
                return { ...shelf, bookIds: [...shelf.bookIds, props.book.localId] }
            } else if (!shouldInclude && currentlyIncludes) {
                return {
                    ...shelf,
                    bookIds: shelf.bookIds.filter((id) => id !== props.book.localId),
                }
            }
            return shelf
        })

        setState("shelves", updatedShelves)
    }

    // Style for dialog trigger button.
    const createDialogTriggerClasses = () =>
        `button absolute cursor-pointer top-2 right-11 w-8 h-8 rounded-full flex items-center justify-center transition-opacity ${
            isVisible() ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`

    return (
        <Dialog>
            <Dialog.Trigger
                class={createDialogTriggerClasses()}
                onClick={initializeSelectedShelves}
            >
                <IconFolderOpen />
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0% data-closed:animate-out data-closed:fade-out-0%" />
                <Dialog.Content class="fixed left-1/2 top-1/2 z-50 min-w-80 max-w-md -translate-x-1/2 -translate-y-1/2 rounded border border-base02 bg-base01 px-6 py-5 data-open:animate-in data-open:fade-in-0% data-open:zoom-in-95% data-open:slide-in-from-top-10% data-closed:animate-out data-closed:fade-out-0% data-closed:zoom-out-95% data-closed:slide-out-to-top-10%">
                    <Dialog.Label class="font-semibold">{props.book.title}</Dialog.Label>
                    <Dialog.Description class="mt-2 text-sm text-base04">
                        <span>Add to Bookshelves</span>
                    </Dialog.Description>

                    {/* List all shelves with checkboxes */}
                    <div class="mt-4 border border-base03 rounded-md divide-y divide-base03 max-h-64 overflow-y-auto">
                        <For each={state.shelves}>
                            {(shelf) => (
                                <label class="flex items-center px-4 py-3 space-x-3 cursor-pointer hover:bg-base02 transition-colors">
                                    <input
                                        type="checkbox"
                                        class="accent-base0D rounded"
                                        checked={selectedShelves().has(shelf.id)}
                                        onChange={(e) =>
                                            handleShelfToggle(shelf.id, e.target.checked)
                                        }
                                    />
                                    <span class="text-base05 truncate">{shelf.name}</span>
                                </label>
                            )}
                        </For>
                    </div>

                    {/* Dialog actions */}
                    <div class="mt-6 flex justify-end space-x-2">
                        <Dialog.Close class="cursor-pointer px-4 py-2 text-sm rounded-lg text-base04 hover:bg-base02 transition-colors">
                            Cancel
                        </Dialog.Close>
                        <Dialog.Close
                            class="cursor-pointer px-4 py-2 text-sm font-medium rounded-lg bg-base02 hover:bg-base0D hover:text-base00 transition-colors"
                            onClick={handleSave}
                        >
                            Save
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog>
    )
}

// Renders a single book card with cover, title, progress, and actions.
function BookCard(props: {
    book: ReaderSourceLightRecord
    hoveredBookId: () => number | null
    setHoveredBookId: (id: number | null) => void
    isTouch: () => boolean
    handleBookClick: (e: MouseEvent, book: ReaderSourceLightRecord) => void
}) {
    const { state, setState } = useLibraryContext()
    // Show actions only for hovered/touched book.
    const isVisible = () => (props.isTouch() ? props.hoveredBookId() === props.book.localId : false)

    // Reading progress as percent.
    const progressPercentage = Math.floor((100 * props.book.currChars) / props.book.totalChars)

    // Style for action buttons.
    const createActionButtonClasses = () =>
        `button absolute cursor-pointer top-2 w-8 h-8 border-none hover:ring-2 hover:ring-(--base08) rounded-full flex items-center justify-center transition-opacity ${
            isVisible() ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`

    // Delete book from library and DB.
    const handleDeleteBook = async (e: MouseEvent) => {
        e.preventDefault()
        if (!confirm("Are you sure you want to delete this book?")) return

        await LumiDb.deleteBookById(props.book.localId)
        setState(
            "books",
            state.books.filter((book) => book.localId !== props.book.localId),
        )
    }

    return (
        <div class="relative group book-card">
            <A
                href={`/reader/${props.book.localId}`}
                onClick={(e) => props.handleBookClick(e, props.book)}
            >
                <div
                    class="bg-base01 shadow-lg hover:shadow-xl transition-shadow rounded overflow-hidden"
                    onMouseLeave={() => props.isTouch() && props.setHoveredBookId(null)}
                >
                    <img
                        src={state.covers[props.book.localId]}
                        alt={props.book.title}
                        class="w-full h-48 object-cover"
                    />
                    <div class="p-3">
                        <p class="font-semibold truncate">{props.book.title}</p>
                        <p class="text-sm text-base04 truncate">{props.book.creator}</p>
                        <div class="bg-base02 w-full rounded mt-2">
                            <div
                                class="bg-base0D h-[4px] rounded"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </A>

            {/* Bookshelf dialog trigger */}
            <BookshelfDialog
                book={props.book}
                hoveredBookId={props.hoveredBookId}
                isTouch={props.isTouch}
            />

            {/* Delete button */}
            <button class={`${createActionButtonClasses()} right-2`} onClick={handleDeleteBook}>
                <IconTrash />
            </button>
        </div>
    )
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
