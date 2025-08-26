import { ReaderSourceLightRecord } from "@/lib/db"
import { A } from "@solidjs/router"
import { createEffect, createSignal, For, Show } from "solid-js"
import { IconFolderOpen, IconTrash } from "@/components/icons"
import Modal, { ModalProps } from "@/components/Modal"
import { useLibraryDispatch, useLibraryState } from "@/context/library"

type BookCardProps = {
    book: ReaderSourceLightRecord
    hovered: boolean
    onInfoClick: () => void

    // used to track click/hover on touch devices
    // the state is shared between other book-cards so it handled by
    // the parent (BookGrid)
    onClick: (e: MouseEvent) => void
}

// Renders a single book card with cover, title, progress, and actions.
export function BookCard(props: BookCardProps) {
    const libraryState = useLibraryState()
    const libraryDispatch = useLibraryDispatch()

    // Reading progress as percent.
    // It doesn't change while the compoment is mounted, so no need to use a function
    const progressPercentage = Math.floor((100 * props.book.currChars) / props.book.totalChars)

    // Delete book from library and DB.
    const handleDeleteBook = async (e: MouseEvent) => {
        e.preventDefault()
        if (!confirm("Are you sure you want to delete this book?")) return
        await libraryDispatch.deleteBook(props.book.localId)
    }

    return (
        <div class="relative group book-card">
            {/* Main View, buttons are absolute and are outside the <a> to avoid click event propagation */}
            <A href={`/reader/${props.book.localId}`} onClick={props.onClick}>
                <div class="bg-base01 shadow-lg hover:shadow-xl transition-shadow rounded overflow-hidden">
                    <img
                        src={libraryState.coverUrls[props.book.localId]}
                        alt={props.book.title}
                        class="w-full h-48 object-cover"
                    />
                    <div class="p-3">
                        <p class="font-semibold truncate">{props.book.title}</p>
                        <p class="text-sm text-base04 truncate">{props.book.creator}</p>
                        <div class="bg-base02 w-full rounded mt-2">
                            <div class="bg-base0D h-[4px] rounded" style={{ width: `${progressPercentage}%` }} />
                        </div>
                    </div>
                </div>
            </A>

            {/* Buttons */}
            {/* Info button */}
            <button
                class="bg-base02 absolute cursor-pointer top-2 w-8 h-8 border-none opacity-0 group-hover:opacity-100 hover:ring-2 hover:ring-base08 rounded-full flex items-center justify-center transition-opacity right-11"
                classList={{ "opacity-100": props.hovered }}
                onClick={props.onInfoClick}
            >
                <IconFolderOpen />
            </button>

            {/* Delete button */}
            <button
                class="bg-base02 absolute cursor-pointer top-2 w-8 h-8 border-none opacity-0 group-hover:opacity-100 hover:ring-2 hover:ring-base08 rounded-full flex items-center justify-center transition-opacity right-2"
                classList={{ "opacity-100": props.hovered }}
                onClick={handleDeleteBook}
            >
                <IconTrash />
            </button>
        </div>
    )
}

type BookshelfModalProps = ModalProps & {
    book: ReaderSourceLightRecord | null
}

export function BookshelfModal(props: BookshelfModalProps) {
    const libraryState = useLibraryState()
    const libraryDispatch = useLibraryDispatch()

    // Initialize checked shelves for the book.
    const [selectedShelves, setSelectedShelves] = createSignal(new Set<number>())

    // update every time book changes?
    createEffect(() => {
        if (!props.book) return

        const bookShelves = libraryState.shelves
            .filter((shelf) => shelf.bookIds.includes(props.book!.localId))
            .map((shelf) => shelf.id)
        setSelectedShelves(new Set(bookShelves))
    })

    // -- clicks handlers
    const handleShelfToggle = (shelfId: number, checked: boolean) => {
        const newSelected = new Set(selectedShelves())
        if (checked) newSelected.add(shelfId)
        else newSelected.delete(shelfId)
        setSelectedShelves(newSelected)
    }

    // Save shelf changes to DB and state.
    // TODO: improve logic to avoid unnecessary iterations
    const handleSave = async () => {
        if (!props.book) return
        const shelves = selectedShelves()

        // Remove book from shelves where it's no longer selected
        for (const shelf of libraryState.shelves.filter((shelf) => shelf.bookIds.includes(props.book!.localId))) {
            if (!shelves.has(shelf.id)) {
                libraryDispatch.toggleBookInShelf(shelf.id, props.book.localId)
            }
        }

        // Add book to newly selected shelves
        for (const shelfId of shelves) {
            const shelf = libraryState.shelves.find((s) => s.id === shelfId)
            if (shelf && !shelf.bookIds.includes(props.book.localId)) {
                libraryDispatch.toggleBookInShelf(shelf.id, props.book.localId)
            }
        }

        props.onDismiss?.()
    }

    return (
        <Modal show={props.book !== null} onDismiss={props.onDismiss}>
            <h2 class="font-semibold">{props.book?.title}</h2>
            <p class="mt-2 text-sm text-base04">
                <span>Add to Bookshelves</span>
            </p>

            {/* List all shelves with checkboxes */}
            <Show when={libraryState.shelves.length > 0} fallback={<p>No shelves have been created yet.</p>}>
                <div class="mt-4 border border-base03 rounded-md divide-y divide-base03 max-h-64 overflow-y-auto">
                    <For each={libraryState.shelves}>
                        {(shelf) => (
                            <label class="flex items-center px-4 py-3 space-x-3 cursor-pointer hover:bg-base02 transition-colors">
                                <input
                                    type="checkbox"
                                    class="accent-base0D rounded"
                                    checked={selectedShelves().has(shelf.id)}
                                    onChange={(e) => handleShelfToggle(shelf.id, e.target.checked)}
                                />
                                <span class="text-base05 truncate">{shelf.name}</span>
                            </label>
                        )}
                    </For>
                </div>
            </Show>
            {/* Actions */}
            <div class="mt-6 flex justify-end space-x-2">
                <button
                    class="cursor-pointer px-4 py-2 text-sm rounded-lg text-base04 hover:bg-base02 transition-colors"
                    onClick={props.onDismiss}
                >
                    Cancel
                </button>
                <button
                    class="cursor-pointer px-4 py-2 text-sm font-medium rounded-lg bg-base02 hover:bg-base0D hover:text-base00 transition-colors"
                    onClick={handleSave}
                >
                    Save
                </button>
            </div>
        </Modal>
    )
}
