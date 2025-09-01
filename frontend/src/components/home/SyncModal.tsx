import { createEffect, createResource, createSignal, For } from "solid-js"
import { LumiDb, ReaderSourceData, ReaderSourceLightRecord, ReaderSourceRecord } from "@/db"
import { syncedBooksApi } from "@/api/userBooks"
import Modal from "@/components/Modal"
import Checkbox from "@/ui/checkbox"

export function SyncModal(props: { show: boolean; onDismiss?: () => void; books: ReaderSourceLightRecord[] }) {
    const [selectedBooks, setSelectedBooks] = createSignal<Set<string>>(new Set())

    const toggleSelected = (id: string) => {
        setSelectedBooks((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const [cloudBooks] = createResource(async () => {
        const res = await syncedBooksApi.getAll()
        if (res.error) {
            console.error(res.error)
            return []
        }
        return res.ok.data
    })

    createEffect(() => {
        const books = cloudBooks() || []
        // Only auto-select books that are both in cloud and local
        const localBookIds = new Set(props.books.map((b) => b.uniqueId))
        const syncableBooks = books.filter((b) => localBookIds.has(b.uniqueId))
        setSelectedBooks(new Set(syncableBooks.map((b) => b.uniqueId)))
    })

    const isLocalBook = (bookId: string) => {
        return props.books.some((book) => book.uniqueId === bookId)
    }

    const isInCloud = (bookId: string) => {
        return cloudBooks()?.some((cb) => cb.uniqueId === bookId) || false
    }

    const downloadBook = async (bookId: string) => {
        const cloudBook = cloudBooks()?.find((cb) => cb.uniqueId === bookId)
        if (!cloudBook?.compressedDataUrl) return

        const res = await syncedBooksApi.fetchData(cloudBook.compressedDataUrl)
        if (res.error) return console.error(res.error)

        if (cloudBook.kind === "epub") {
            await LumiDb.saveBookRecord(
                {
                    ...cloudBook,
                    ...res.ok,
                } as ReaderSourceRecord,
                false,
            )
        }
    }

    const onSyncHandler = async () => {
        if (selectedBooks().size > 3) return

        // 1. Delete unselected cloud books
        const allCloudBooks = cloudBooks() || []
        const unselectedCloudBooks = allCloudBooks.filter((b) => !selectedBooks().has(b.uniqueId))
        for (const book of unselectedCloudBooks) {
            await syncedBooksApi.delete(book.uniqueId)
        }

        // 2. Prepare only local books for sync
        let localBooksToSync = props.books.filter((b) => selectedBooks().has(b.uniqueId))
        let localBooks = localBooksToSync.map((b) => ({
            kind: b.kind,
            uniqueId: b.uniqueId,
            title: b.title,
            creator: b.creator,
            language: b.language,
            totalChars: b.totalChars,
            currChars: b.currChars,
            currParagraph: b.currParagraph,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
        }))

        const syncBooks = [...localBooks]
        const res = await syncedBooksApi.sync(syncBooks)
        if (res.error) return console.error(res.error)

        const data = res.ok.data!
        const newBooks = data.newBooks
        await Promise.all(
            newBooks.map(async (b) => {
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
            }),
        )

        let updatedBooks = data.updatedBooks
        await Promise.all(
            updatedBooks.map(async (b) => {
                const fullBook = await LumiDb.getBookByUniqueId(b.uniqueId)
                if (fullBook) {
                    const updatedBook = { ...fullBook, ...b }
                    await LumiDb.saveBookRecord(updatedBook, false)
                } else {
                    const res = await syncedBooksApi.fetchData(b.compressedDataUrl!)
                    if (res.error) return console.error(res.error)
                    if (b.kind === "epub") {
                        await LumiDb.saveBookRecord(
                            {
                                ...b,
                                ...res.ok,
                            } as ReaderSourceRecord,
                            false,
                        )
                    }
                }
            }),
        )
        props.onDismiss?.()
    }

    // Get all books (local + cloud-only) for display
    const getAllBooks = () => {
        const localBooks = props.books
        const cloudOnlyBooks = (cloudBooks() || []).filter((cb) => !isLocalBook(cb.uniqueId))
        return [...localBooks, ...cloudOnlyBooks]
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
                <span>Select books to sync content or download cloud books</span>
            </p>
            <div class="mt-4 border border-base03 rounded-md divide-y divide-base03 max-h-64 overflow-y-auto">
                <For each={getAllBooks()}>
                    {(book) => (
                        <div class="flex items-center px-4 py-3 space-x-3 hover:bg-base02 transition-colors">
                            <span class="text-base05 truncate flex-1">{book.title}</span>
                            {isInCloud(book.uniqueId) && (
                                <span class="text-xs bg-base0D text-base00 px-2 py-1 rounded-full">In Cloud</span>
                            )}
                            {isLocalBook(book.uniqueId) ? (
                                <Checkbox
                                    class="ml-auto"
                                    checked={selectedBooks().has(book.uniqueId)}
                                    onChange={() => toggleSelected(book.uniqueId)}
                                />
                            ) : (
                                <button
                                    class="ml-auto px-3 py-1 text-xs font-medium rounded bg-base0C text-base00 hover:bg-base0C/80 transition-colors"
                                    onClick={() => downloadBook(book.uniqueId)}
                                >
                                    Download
                                </button>
                            )}
                        </div>
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
