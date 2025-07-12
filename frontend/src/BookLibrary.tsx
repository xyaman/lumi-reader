import { createEffect, createSignal } from "solid-js"
import { IconFilter, IconUpload } from "./components/icons"
import BooksGrid from "./components/library/BooksGrid"
import { useLibraryContext } from "./context/library"
import { LumiDb, ReaderSourceLightRecord } from "./lib/db"
import { EpubBook } from "./lib/epub"

import Popover from "@corvu/popover"

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

export default function BookLibrary() {
    const { setState } = useLibraryContext()

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
                        <label class="max-h-[40px] cursor-pointer relative rounded-md bg-base02 hover:bg-base03 px-4 py-2 flex items-center">
                            <input
                                type="file"
                                accept=".epub"
                                multiple
                                onInput={handleUpload}
                                class="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <IconUpload />
                            <span class="cursor-pointer ml-2">Upload Book</span>
                        </label>
                        <SortPopover />
                    </div>
                </div>
            </header>
            <BooksGrid />
        </>
    )
}
