import { createEffect, createResource, createSignal, For } from "solid-js"
import { IconCloud, IconFilter, IconUpload } from "./components/icons"
import BooksGrid from "./components/library/BooksGrid"
import { LumiDb, ReaderSourceData, ReaderSourceLightRecord, ReaderSourceRecord } from "./lib/db"

import Popover from "@corvu/popover"
import Modal from "./components/Modal"
import Checkbox from "./components/Checkbox"
import { SyncedBook, syncedBooksApi } from "./api/syncedBooks"
import { useLibraryDispatch, useLibraryState } from "./context/library"

function SortPopover() {
    const libraryState = useLibraryState()
    const { setSortParams } = useLibraryDispatch()

    const [sortBy, setSortBy] = createSignal(libraryState.sort || "lastModifiedDate")
    const [order, setOrder] = createSignal(libraryState.dir || "desc")

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
                                    checked={sortBy() === "byLastUpdate"}
                                    onChange={() => setSortBy("byLastUpdate")}
                                />
                                <span class="ml-2">Last Read</span>
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={sortBy() === "byCreationDate"}
                                    onChange={() => setSortBy("byCreationDate")}
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

function SyncModal(props: { show: boolean; onDismiss?: () => void; books: ReaderSourceLightRecord[] }) {
    const [checkedBooks, setCheckedBooks] = createSignal<Set<string>>(new Set())
    const toggleChecked = (id: string) => {
        setCheckedBooks((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const [cloudBooks] = createResource(async () => {
        const res = await syncedBooksApi.getAll()
        if (res.error) throw res.error
        const books = res.ok.data!.books
        return books
    })

    const onSyncHandler = async () => {
        if (checkedBooks().size > 5) return
        let books = props.books.filter((b) => checkedBooks().has(b.uniqueId)) as SyncedBook[]
        books = [...books, ...(cloudBooks() || [])]
        const res = await syncedBooksApi.sync(books)
        if (res.error) return console.error(res.error)

        const data = res.ok.data!
        const newBooks = data.newBooks
        newBooks.forEach(async (b) => {
            const fullBook = await LumiDb.getBookByUniqueId(b.uniqueId)
            const data: ReaderSourceData = {
                sections: fullBook!.sections,
                nav: fullBook!.nav,
                bookmarks: fullBook!.bookmarks,
                images: fullBook!.images,
                css: fullBook!.css,
            }
            const res = await syncedBooksApi.uploadData(b.uniqueId, data)
            console.log(res)
        })

        const updatedBooks = data.updatedBooks
        updatedBooks.forEach(async (b) => {
            const fullBook = await LumiDb.getBookByUniqueId(b.uniqueId)
            if (fullBook) {
                const updatedBook = { ...fullBook, ...b }
                await LumiDb.saveBookRecord(updatedBook)
            } else {
                const res = await syncedBooksApi.fetchData(b.compressedDataUrl!)
                if (res.error) return console.error(res.error)
                if (b.kind === "epub") {
                    await LumiDb.saveBookRecord({
                        ...b,
                        ...res.ok,
                    } as ReaderSourceRecord)
                }
            }
        })

        props.onDismiss?.()
    }

    return (
        <Modal show={props.show} onDismiss={props.onDismiss}>
            <h2 class="mb-4 font-semibold text-xl">Manage Content Sync</h2>
            <div class="bg-base02 p-4 rounded-lg mb-6">
                <p class="font-medium mb-2">
                    Your sync limit: <span class="text-base0D">3 books</span> (Free Plan)
                </p>
                <p class="text-sm text-[var(--base05)]">Upgrade to sync more books simultaneously.</p>
            </div>
            <p class="mt-2 text-sm text-base04">
                <span>Books in the cloud</span>
            </p>
            <div class="mt-4 mb-8 border border-base03 rounded-md divide-y divide-base03 max-h-64 overflow-y-auto">
                <For each={cloudBooks() || []}>
                    {(book) => (
                        <label class="flex items-center px-4 py-3 space-x-3 cursor-pointer hover:bg-base02 transition-colors">
                            <span class="text-base05 truncate">{book.title}</span>
                            <Checkbox class="ml-auto" checked={true} onChange={() => {}} />
                        </label>
                    )}
                </For>
            </div>
            <p class="mt-2 text-sm text-base04">
                <span>Select books to sync content</span>
            </p>
            <div class="mt-4 border border-base03 rounded-md divide-y divide-base03 max-h-64 overflow-y-auto">
                <For each={props.books}>
                    {(book) => (
                        <label class="flex items-center px-4 py-3 space-x-3 cursor-pointer hover:bg-base02 transition-colors">
                            <span class="text-base05 truncate">{book.title}</span>
                            <Checkbox
                                class="ml-auto"
                                checked={checkedBooks().has(book.uniqueId)}
                                onChange={() => toggleChecked(book.uniqueId)}
                            />
                        </label>
                    )}
                </For>
            </div>
            <div class="mt-6 flex justify-end space-x-2">
                <button
                    class="cursor-pointer px-4 py-2 text-sm font-medium rounded-lg bg-base02 hover:bg-base0D hover:text-base00 transition-colors"
                    onClick={onSyncHandler}
                >
                    Sync
                </button>
            </div>
        </Modal>
    )
}

export default function BookLibrary() {
    const libraryState = useLibraryState()
    const { createBook } = useLibraryDispatch()

    const [showModal, setShowModal] = createSignal(false)

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        await createBook(files)
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
            <SyncModal show={showModal()} onDismiss={() => setShowModal(false)} books={libraryState.books} />
        </>
    )
}
