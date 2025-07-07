import { For, Show } from "solid-js"
import { useLibraryContext } from "@/context/library"

type BookshelvesSidebarProps = {
    editShelf: () => { id: number; name: string } | null
    setEditShelf: (shelf: { id: number; name: string } | null) => void
    deleteShelf: (id: number) => void
}

export default function BookshelvesSidebar(props: BookshelvesSidebarProps) {
    const { state, setState, addShelf, renameShelf } = useLibraryContext()
    const { editShelf, setEditShelf, deleteShelf } = props

    return (
        <>
            <div class="flex items-center">
                <h2 class="text-lg font-semibold">Bookshelves</h2>
                <button
                    class="button-theme text-sm ml-auto rounded-lg p-2"
                    onClick={() => setEditShelf({ id: -1, name: "" })}
                >
                    + New
                </button>
            </div>

            <div class="flex justify-between items-center mb-2">
                <button
                    class={`flex-1 text-left truncate text-sm ${
                        state.activeShelf === null
                            ? "font-semibold border-l-2 pl-1"
                            : "font-light text-(--base05)"
                    }`}
                    onClick={() => setState("activeShelf", null)}
                >
                    All Books ({state.books.length})
                </button>
            </div>

            <div class="flex flex-col gap-2 overflow-y-auto">
                <For each={state.shelves}>
                    {(s) => (
                        <div class="flex items-center gap-2 group">
                            <button
                                class={`flex-1 text-left truncate text-sm ${
                                    state.activeShelf === s.id
                                        ? "font-semibold border-l-2 pl-1"
                                        : "font-light text-(--base05)"
                                }`}
                                onClick={() => setState("activeShelf", s.id)}
                            >
                                {s.name} ({s.bookIds.length})
                            </button>

                            <button
                                class="button-theme rounded-lg px-2 py-1 text-xs opacity-0 group-hover:opacity-100"
                                onClick={() => setEditShelf({ id: s.id, name: s.name })}
                            >
                                Edit
                            </button>

                            <button
                                class="button-theme rounded-lg px-2 py-1 text-xs opacity-0 group-hover:opacity-100"
                                onClick={() => deleteShelf(s.id)}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </For>
            </div>

            {/* Shelf Creation Modal */}
            <Show when={editShelf()?.id !== undefined && editShelf() !== null}>
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div class="body-theme rounded-xl p-6 w-full max-w-sm">
                        <h3 class="text-lg font-semibold mb-4">
                            {editShelf()?.id === -1 ? "Create New Shelf" : "Edit Shelf"}
                        </h3>

                        <input
                            class="w-full px-3 py-2 border rounded text-sm"
                            placeholder="Shelf name"
                            value={editShelf()?.name}
                            onInput={(e) => {
                                if (editShelf()) {
                                    setEditShelf({ ...editShelf()!, name: e.currentTarget.value })
                                } else {
                                    setEditShelf({ id: -1, name: e.currentTarget.value })
                                }
                            }}
                        />
                        <div class="mt-4 flex justify-end gap-2">
                            <button
                                class="button-theme rounded-lg p-2 text-sm"
                                onClick={() => setEditShelf(null)}
                            >
                                Cancel
                            </button>
                            <button
                                class="button-theme rounded-lg p-2 text-sm"
                                onClick={async () => {
                                    if (!editShelf()) return
                                    const name = editShelf()?.name.trim()
                                    if (!name) return
                                    if (editShelf()?.id === -1) {
                                        await addShelf(editShelf()!.name)
                                    } else {
                                        await renameShelf(editShelf()!.id, editShelf()!.name)
                                    }
                                    setEditShelf(null)
                                }}
                            >
                                {editShelf()?.id === -1 ? "Create" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    )
}
