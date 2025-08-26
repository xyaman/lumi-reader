import { createResource, createSignal, For } from "solid-js"
import { LumiDb, ReaderSourceData, ReaderSourceLightRecord, ReaderSourceRecord } from "@/lib/db"
import { SyncedBook, syncedBooksApi } from "@/api/syncedBooks"
import Modal from "@/components/Modal"
import Checkbox from "@/ui/checkbox"

export function SyncModal(props: { show: boolean; onDismiss?: () => void; books: ReaderSourceLightRecord[] }) {
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
        // TODO: error text
        if (res.error) return []
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
