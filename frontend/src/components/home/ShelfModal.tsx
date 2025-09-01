import { createEffect, createSignal, Show } from "solid-js"
import { useLibraryDispatch } from "@/context/library"
import Modal from "@/components/Modal"
import { Bookshelf } from "@/db"
import { Button } from "@/ui"

type Props = {
    show: boolean
    shelf?: Bookshelf | null
    onDismiss?: () => void
}

export function ShelfModal(props: Props) {
    const libraryDispatch = useLibraryDispatch()
    const [shelfName, setShelfName] = createSignal("")

    // Add shelf to state
    const handleName = async () => {
        const name = shelfName().trim()
        if (!name) return

        if (props.shelf) {
            await libraryDispatch.renameShelf(props.shelf.id, name)
        } else {
            await libraryDispatch.createShelf(name)
        }
        setShelfName("")
        props.onDismiss?.()
    }

    const handleRemove = async () => {
        if (!props.shelf) return
        if (!confirm(`Are you sure you want to remove: ${props.shelf.name}`)) return

        await libraryDispatch.deleteShelf(props.shelf.id)
        setShelfName("")
        props.onDismiss?.()
    }

    // clean input when `props.shelf` changes
    createEffect(() => {
        setShelfName(props.shelf ? props.shelf.name : "")
    })

    return (
        <Modal show={props.show} onDismiss={props.onDismiss}>
            <h2 class="font-semibold mb-4">{props.shelf ? "Edit Bookshelf" : "Create Bookshelf"}</h2>
            <input
                class="mt-4 w-full p-2 border rounded border-base02"
                placeholder="Shelf name"
                value={shelfName()}
                onInput={(e) => setShelfName(e.currentTarget.value)}
            />
            <div class="mt-6 flex justify-between">
                <Show when={props.shelf}>
                    <Button onClick={handleRemove}>Delete</Button>
                </Show>
                <div class="flex ml-auto space-x-2">
                    <button class="px-4 py-2 text-sm rounded-lg" onClick={props.onDismiss}>
                        Cancel
                    </button>
                    <button
                        class="px-4 py-2 text-sm font-medium rounded-lg bg-base02 hover:bg-base0D hover:text-base00"
                        onClick={handleName}
                    >
                        {props.shelf ? "Rename" : "Add"}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
