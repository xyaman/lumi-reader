import { createEffect, createSignal, For } from "solid-js"
import { IconCloud, IconFilter, IconUpload } from "./components/icons"
import BooksGrid from "./components/library/BooksGrid"
import { useLibraryContext } from "./context/library"
import { LumiDb, ReaderSourceLightRecord } from "./lib/db"
import { EpubBook } from "./lib/epub"

import Popover from "@corvu/popover"
import Modal from "./components/Modal"
import Checkbox from "./components/Checkbox"

function SortPopover() {
    const { setSortParams, state } = useLibraryContext()

    const [sortBy, setSortBy] = createSignal(state.sort || "lastModifiedDate")
    const [order, setOrder] = createSignal(state.dir || "desc")

    createEffect(() => {
        setSortParams(sortBy(), order())
    })

    return (
        <Popover floatingOptions={{ offset: 13, flip: true, shift: true }}>
            <Popover.Trigger class="max-h-[40px] cursor-pointer bg-base02 hover:bg-base03 px-4 rounded-md flex items-center">
                <IconFilter />
                <span class="ml-2">Sort</span>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content class="z-50 rounded-lg bg-base02 px-3 py-2 shadow-md">
                    <Popover.Label class="font-bold">Sort Options</Popover.Label>
                    <div class="mt-2">
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={sortBy() === "lastModifiedDate"}
                                    onChange={() => setSortBy("lastModifiedDate")}
                                />
                                <span class="ml-2">Last Read</span>
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={sortBy() === "creationDate"}
                                    onChange={() => setSortBy("creationDate")}
                                />
                                <span class="ml-2">Added Time</span>
                            </label>
                        </div>
                        <div class="mt-2">
                            <label>
                                <input
                                    type="radio"
                                    name="order"
                                    checked={order() === "asc"}
                                    onChange={() => setOrder("asc")}
                                />
                                <span class="ml-2">Ascending</span>
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="order"
                                    checked={order() === "desc"}
                                    onChange={() => setOrder("desc")}
                                />
                                <span class="ml-2">Descending</span>
                            </label>
                        </div>
                    </div>
                    <Popover.Arrow class="text-base02" />
                </Popover.Content>
            </Popover.Portal>
        </Popover>
    )
}

function SyncModal(props: {
    show: boolean
    onDismiss?: () => void
    books: ReaderSourceLightRecord[]
}) {
    return (
        <Modal show={props.show} onDismiss={props.onDismiss}>
            <h2 class="mb-4 font-semibold text-xl">Manage Content Sync</h2>
            <div class="bg-base02 p-4 rounded-lg mb-6">
                <p class="font-medium mb-2">
                    Your sync limit: <span class="text-base0D">3 books</span> (Free Plan)
                </p>
                <p class="text-sm text-[var(--base05)]">
                    Upgrade to sync more books simultaneously.
                </p>
            </div>
            <p class="mt-2 text-sm text-base04">
                <span>Select books to sync content</span>
            </p>
            <div class="mt-4 border border-base03 rounded-md divide-y divide-base03 max-h-64 overflow-y-auto">
                <For each={props.books}>
                    {(book) => (
                        <label class="flex items-center px-4 py-3 space-x-3 cursor-pointer hover:bg-base02 transition-colors">
                            <span class="text-base05 truncate">{book.title}</span>
                            <Checkbox class="ml-auto" checked={false} onChange={() => {}} />
                        </label>
                    )}
                </For>
            </div>
        </Modal>
    )
}

export default function BookLibrary() {
    const { state, setState } = useLibraryContext()
    const [showModal, setShowModal] = createSignal(false)

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        const newBooks: ReaderSourceLightRecord[] = []

        for (const file of files) {
            if (!file.type.includes("epub") && !file.name.endsWith(".epub")) continue

            // TODO: this also creates the image blob.. check??
            const book = await EpubBook.fromFile(file)
            book.deinit()
            if (!book.localId) continue

            const light = await LumiDb.getLightBookById(book.localId)
            if (light) {
                newBooks.push(light)
            }
        }

        if (newBooks.length > 0) {
            setState("books", (prev) => [...prev, ...newBooks])
        }
    }

    return (
        <>
            <header class="mb-8">
                <div class="flex flex-col md:flex-row justify-between">
                    <h1 class="text-3xl font-bold mb-2 md:mb-0">Your Library</h1>
                    <div class="flex space-y-2 md:space-y-0 space-x-2 ml-auto">
                        <button
                            class="max-h-[40px] cursor-pointer bg-base02 hover:bg-base03 px-4 rounded-md flex items-center"
                            onClick={() => setShowModal(true)}
                        >
                            <IconCloud />
                            <span class="ml-2">Sync</span>
                        </button>
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
                        <SortPopover />
                    </div>
                </div>
            </header>
            <BooksGrid />
            <SyncModal
                show={showModal()}
                onDismiss={() => setShowModal(false)}
                books={state.books}
            />
        </>
    )
}
