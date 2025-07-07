import { createSignal, For, Show } from "solid-js"
import { useLibraryContext } from "@/context/library"

// Define proper types
type Shelf = {
    id: number
    name: string
}

type EditShelfState = Shelf | null

// Extract modal to a separate component
function EditShelfModal(props: {
    shelf: Shelf
    onSave: (shelf: Shelf) => Promise<void>
    onCancel: () => void
}) {
    const [name, setName] = createSignal(props.shelf.name)
    const isNew = props.shelf.id === -1

    const handleSave = async () => {
        if (!name().trim()) return
        await props.onSave({ ...props.shelf, name: name() })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") handleSave()
        if (e.key === "Escape") props.onCancel()
    }

    return (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div class="body-theme rounded-xl p-6 w-full max-w-sm">
                <h3 class="text-lg font-semibold mb-4">
                    {isNew ? "Create New Shelf" : "Edit Shelf"}
                </h3>

                <input
                    class="w-full px-3 py-2 border rounded text-sm"
                    placeholder="Shelf name"
                    value={name()}
                    onInput={(e) => setName(e.currentTarget.value)}
                    onKeyDown={handleKeyDown}
                    autofocus
                />
                <div class="mt-4 flex justify-end gap-2">
                    <button class="button rounded-lg p-2 text-sm" onClick={props.onCancel}>
                        Cancel
                    </button>
                    <button
                        class="button rounded-lg p-2 text-sm"
                        onClick={handleSave}
                        disabled={!name().trim()}
                    >
                        {isNew ? "Create" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function SidebarContent() {
    const { state, setState, addShelf, renameShelf, removeShelf } = useLibraryContext()
    const [editShelf, setEditShelf] = createSignal<EditShelfState>(null)

    const isActive = (id: number | null) => state.activeShelf === id
    const shelfButtonClass = (active: boolean) =>
        `cursor-pointer flex-1 text-left truncate text-sm  hover:font-bold ${active ? "font-semibold border-l-2 pl-1" : "font-light text-(--base05)"}`

    const handleSaveShelf = async (shelf: Shelf) => {
        try {
            if (shelf.id === -1) {
                await addShelf(shelf.name)
            } else {
                await renameShelf(shelf.id, shelf.name)
            }
            setEditShelf(null)
        } catch (error) {
            console.error("Failed to save shelf:", error)
            alert("Failed to save shelf. Please try again.")
        }
    }

    const handleDeleteShelf = async (shelfId: number) => {
        if (!confirm("Are you sure you want to delete this shelf?")) return

        try {
            // Update active shelf if we're deleting the current one
            if (state.activeShelf === shelfId) setState("activeShelf", null)
            await removeShelf(shelfId)
        } catch (error) {
            console.error("Failed to delete shelf:", error)
            alert("Failed to delete shelf. Please try again.")
        }
    }

    const openNewShelfModal = () => setEditShelf({ id: -1, name: "" })
    const editExistingShelf = (shelf: Shelf) => setEditShelf({ ...shelf })
    const closeModal = () => setEditShelf(null)

    return (
        <>
            <div class="flex items-center md:mb-2">
                <h2 class="text-md font-semibold">Bookshelves</h2>
                <button class="button text-xs md:text-sm ml-auto" onClick={openNewShelfModal}>
                    + New
                </button>
            </div>

            <div class="flex justify-between items-center mt-3 mb-2 md:mb-1">
                <button
                    class={shelfButtonClass(isActive(null))}
                    onClick={() => setState("activeShelf", null)}
                >
                    All Books ({state.books.length})
                </button>
            </div>

            <div class="flex flex-col gap-2 overflow-y-auto">
                <For each={state.shelves}>
                    {(shelf) => (
                        <div class="flex items-center gap-2 group">
                            <button
                                class={shelfButtonClass(isActive(shelf.id))}
                                onClick={() => setState("activeShelf", shelf.id)}
                            >
                                {shelf.name} ({shelf.bookIds.length})
                            </button>

                            <button
                                class="button rounded-lg px-2 py-1 text-xs md:opacity-0 group-hover:opacity-100"
                                onClick={() => editExistingShelf(shelf)}
                                title="Edit shelf"
                            >
                                Edit
                            </button>

                            <button
                                class="button rounded-lg px-2 py-1 text-xs md:opacity-0 group-hover:opacity-100"
                                onClick={() => handleDeleteShelf(shelf.id)}
                                title="Delete shelf"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </For>
            </div>

            <Show when={editShelf()}>
                {(shelf) => (
                    <EditShelfModal
                        shelf={shelf()}
                        onSave={handleSaveShelf}
                        onCancel={closeModal}
                    />
                )}
            </Show>
        </>
    )
}

export default function BookshelvesSidebar(props: {
    isOverlay: () => boolean
    onCloseOverlay?: () => void
}) {
    return (
        <>
            <Show when={props.isOverlay()}>
                <aside
                    class="fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden"
                    onClick={props.onCloseOverlay}
                >
                    <div class="navbar-theme w-64 h-full p-4" onClick={(e) => e.stopPropagation()}>
                        <SidebarContent />
                    </div>
                </aside>
            </Show>
            <aside class="navbar-theme hidden md:flex p-4 flex-col gap-4 md:w-48 lg:w-64 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
                <SidebarContent />
            </aside>
        </>
    )
}
