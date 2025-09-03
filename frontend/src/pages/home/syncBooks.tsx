import { ApiUserBook, syncedBooksApi } from "@/api/userBooks"
import { BookItem } from "@/components/home/syncBooks"
import { IconCloud, IconHardDrive } from "@/components/icons"
import { useAuthState } from "@/context/auth"
import { LumiDb, ReaderSourceRecord } from "@/db"
import { A, BeforeLeaveEventArgs, useBeforeLeave } from "@solidjs/router"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"

export function SyncBooks() {
    const authState = useAuthState()
    const user = createMemo(() => authState.user)
    const [inProgress, setInProgress] = createSignal(false)

    useBeforeLeave((e: BeforeLeaveEventArgs) => {
        if (inProgress() && !e.defaultPrevented) {
            e.preventDefault()
            setTimeout(() => {
                if (
                    window.confirm(
                        "Cloud synchronization is in progress. Exiting now may result in data loss. Are you sure you want to leave this page?",
                    )
                ) {
                    e.retry(true)
                }
            }, 100)
        }
    })

    const [allBooks, setAllBooks] = createStore({
        cloud: [] as (ApiUserBook & { syncStatus: "up-to-date" | "cloud-new" | "local-new" | "cloud-only" })[],
        localOnly: [] as (ApiUserBook & { syncStatus: "local-only" })[],
    })

    onMount(async () => {
        const [localBooks, cloudResponse] = await Promise.all([
            LumiDb.getAllLightBooks() as Promise<ApiUserBook[]>,
            syncedBooksApi.getAll(),
        ])

        if (cloudResponse.error) {
            console.error("Error fetching cloud books", cloudResponse.error.message)
            return { localOnly: localBooks, cloudBooks: [] }
        }

        const cloudBooksRaw = cloudResponse.ok.data
        const localBooksMap = new Map(localBooks.map((b) => [b.uniqueId, b]))

        const cloudBooks = cloudBooksRaw.map((cb) => {
            const lb = localBooksMap.get(cb.uniqueId)
            if (!lb) return { ...cb, syncStatus: "cloud-only" as const }

            console.log("cloud:", cb.updatedAt, "local:", lb.updatedAt)

            if (lb.updatedAt > cb.updatedAt) {
                return { ...cb, syncStatus: "local-new" as const }
            } else if (cb.updatedAt > lb.updatedAt) {
                return { ...cb, syncStatus: "cloud-new" as const }
            } else {
                return { ...cb, syncStatus: "up-to-date" as const }
            }
        })

        const localOnly = localBooks
            .filter((book) => !cloudBooks.some((cb) => cb.uniqueId === book.uniqueId))
            .map((book) => ({ ...book, syncStatus: "local-only" as const }))

        setAllBooks("cloud", cloudBooks)
        setAllBooks("localOnly", localOnly)
    })

    const syncHandler = async (book: ApiUserBook) => {
        if (inProgress()) return
        setInProgress(true)

        const localBook = await LumiDb.getBookByUniqueId(book.uniqueId)
        if (!localBook) {
            setInProgress(false)
            return console.error("Invalid book.")
        }

        const res = await syncedBooksApi.sync(localBook)
        if (res.error) {
            setInProgress(false)
            return console.log("Error while syncing:", res.error)
        }

        // it means the server had a more updated version
        if (res.ok.data) {
            const cloudBook = {
                ...res.ok.data,
                syncStatus: "up-to-date" as const,
            }
            setAllBooks("cloud", (b) => b.uniqueId === localBook.uniqueId, cloudBook)

            const newBook = {
                ...localBook,
                totalChars: cloudBook.totalChars,
                currChars: cloudBook.currChars,
                currParagraph: cloudBook.currParagraph,
                createdAt: cloudBook.createdAt,
                updatedAt: cloudBook.updatedAt,
            }

            // TODO: update this
            await LumiDb.saveBookRecord(newBook, false)
        } else {
            const cloudBook = {
                ...book,
                syncStatus: "up-to-date" as const,
            }
            setAllBooks("cloud", (b) => b.uniqueId === localBook.uniqueId, cloudBook)
        }

        setInProgress(false)
    }

    // -- handlers
    const uploadHandler = async (book: ApiUserBook, setProgress: (p: number) => void) => {
        if (inProgress()) return

        setInProgress(true)
        const bookData = book
        const fullBook = await LumiDb.getBookByUniqueId(bookData.uniqueId)
        if (!fullBook) {
            setInProgress(false)
            return console.error("Invalid book")
        }

        const data = {
            sections: fullBook.sections,
            nav: fullBook.nav,
            bookmarks: fullBook.bookmarks,
            images: fullBook.images,
            css: fullBook.css,
        }

        const onProgress = (progress: { type: "upload" | "download"; percent: number }) => {
            if (progress.type == "upload") {
                console.log("Upload percentage:", progress.percent)
                setProgress(progress.percent)
            }
        }

        const res = await syncedBooksApi.upload(bookData, data, onProgress)
        if (res.error) {
            setInProgress(false)
            return console.log(res.error)
        }

        const cloudBook = { ...bookData, syncStatus: "up-to-date" as const }
        setAllBooks("cloud", (prev) => [...prev, cloudBook])
        setAllBooks("localOnly", (prev) => prev.filter((b) => b.uniqueId !== cloudBook.uniqueId))
        setInProgress(false)
    }

    const downloadHandler = async (book: ApiUserBook, setProgress: (p: number) => void) => {
        if (inProgress()) return

        setInProgress(true)
        const onProgress = (progress: { type: "upload" | "download"; percent: number }) => {
            if (progress.type === "download") {
                console.log("Download percentage:", progress.percent)
                setProgress(progress.percent)
            }
        }

        if (!book.compressedDataUrl) {
            console.error("Book malformed, must be deleted and upload again.")
            setInProgress(false)
            return
        }

        const res = await syncedBooksApi.download(book.compressedDataUrl, onProgress)
        if (res.error) {
            console.error("Failed donwloading the book", res.error)
            setInProgress(false)
            return
        }

        if (book.kind === "epub") {
            // TODO: problem because local id is not defined
            await LumiDb.saveBookRecord(
                {
                    ...book,
                    ...res.ok,
                } as ReaderSourceRecord,
                false,
            )
            // Move book from cloud-only to synced
            const syncedBook = { ...book, syncStatus: "up-to-date" as const }
            setAllBooks("cloud", (prev) => prev.map((b) => (b.uniqueId === book.uniqueId ? syncedBook : b)))
        } else {
            console.error("unsoported format", book.kind)
        }

        setInProgress(false)
    }

    const deleteHandler = async (book: ApiUserBook) => {
        const res = await syncedBooksApi.delete(book.uniqueId)
        if (res.error) return console.error(res.error)
        setAllBooks("cloud", (prev) => prev.filter((b) => b.uniqueId !== book.uniqueId))
        const localBook = { ...book, syncStatus: "local-only" } as ApiUserBook & { syncStatus: "local-only" }
        setAllBooks("localOnly", (prev) => [...prev, localBook])
    }

    return (
        <>
            <header class="mb-8">
                <h1 class="text-3xl font-bold">Manage Content Sync</h1>
                <p>Sync your books between local and cloud storage</p>
            </header>
            <Show
                when={user()}
                fallback={
                    <p>
                        You must{" "}
                        <A href="/login" class="text-base0D hover:underline">
                            Log in
                        </A>{" "}
                        to use this feature.
                    </p>
                }
            >
                <main class="space-y-8">
                    <section class="bg-base02 p-4 rounded-lg mb-6">
                        <p class="font-medium mb-2">
                            Your sync limit: <span class="text-base0D">{user()!.tier.bookSyncLimit} books </span>(
                            {user()!.tier.name + " "} Plan)
                        </p>
                        <p class="text-sm">Upgrade to sync more books simultaneously.</p>
                    </section>

                    {/* Cloud Books (Synced + Cloud Only) */}
                    <section>
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="flex items-center text-xl font-semibold">
                                <IconCloud class="mr-2" stroke-width={2} />
                                Cloud Books
                            </h2>
                            <span class="px-3 py-1 bg-base05 text-base01 rounded-full text-sm">
                                {allBooks.cloud.length} books
                            </span>
                        </div>

                        <ul class="bg-base01 rounded-lg shadow divide-y divide-base03">
                            <For each={allBooks.cloud}>
                                {(book) => (
                                    <BookItem
                                        book={book}
                                        deleteHandler={deleteHandler}
                                        downloadHandler={downloadHandler}
                                        syncHandler={syncHandler}
                                    />
                                )}
                            </For>
                        </ul>
                    </section>

                    {/* Local Only Books */}
                    <section>
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="flex items-center text-xl font-semibold">
                                <IconHardDrive class="mr-2" stroke-width={2} />
                                Local Only Books
                            </h2>
                            <span class="px-3 py-1 bg-base05 text-base01 rounded-full text-sm">
                                {allBooks.localOnly.length} books
                            </span>
                        </div>

                        <ul class="bg-base01 rounded-lg shadow divide-y divide-base03">
                            <For each={allBooks.localOnly}>
                                {(book) => <BookItem book={book} uploadHandler={uploadHandler} />}
                            </For>
                        </ul>
                    </section>
                </main>
            </Show>
        </>
    )
}
