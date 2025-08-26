import { createSignal } from "solid-js"
import { useLibraryDispatch, useLibraryState } from "@/context/library"
import { IconCloud, IconUpload } from "@/components/icons"
import { SyncModal } from "@/components/home/SyncModal"
import { BooksGrid, SortPopover } from "@/components/home/library"
import { Button } from "@/ui"

export function Library() {
    const libraryState = useLibraryState()
    const libraryDispatch = useLibraryDispatch()

    const [showModal, setShowModal] = createSignal(false)

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        await libraryDispatch.createBook(files)
    }

    return (
        <>
            <header class="mb-8">
                <div class="flex flex-col md:flex-row justify-between">
                    <h1 class="text-3xl font-bold mb-2 md:mb-0">Your Library</h1>
                    <div class="flex space-y-2 md:space-y-0 space-x-2 ml-auto">
                        {/* Sync button */}
                        <Button
                            classList={{ "max-h-[40px] flex items-center": true }}
                            onClick={() => setShowModal(true)}
                        >
                            <IconCloud />
                            <span class="ml-2">Sync</span>
                        </Button>

                        {/* Upload button  */}
                        <label class="max-h-[40px] cursor-pointer relative rounded-md bg-base02 hover:bg-base03 px-4 py-2 flex items-center">
                            <input
                                type="file"
                                accept=".epub"
                                multiple
                                onInput={handleUpload}
                                class="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <IconUpload />
                            <span class="cursor-pointer ml-2">Upload</span>
                        </label>

                        {/* Sort button */}
                        <SortPopover />
                    </div>
                </div>
            </header>

            <BooksGrid />

            {/* Server sync
                TODO: Modal fails to open when there is no connection to the server? Hide when offline?
            */}
            <SyncModal show={showModal()} onDismiss={() => setShowModal(false)} books={libraryState.books} />
        </>
    )
}
