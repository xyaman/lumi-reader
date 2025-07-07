import { createMemo, For } from "solid-js"
import { IconFolderOpen, IconTrash } from "@/components/icons"
import { ReaderSourceLightRecord } from "@/lib/db"
import { A } from "@solidjs/router"
import { useLibraryContext } from "@/context/library"

type BooksGridProps = {
    onSelectBook: (b: ReaderSourceLightRecord) => void
    onDeleteBook: (b: ReaderSourceLightRecord) => void
}

export default function BooksGrid(props: BooksGridProps) {
    const { state } = useLibraryContext()

    const visibleBooks = createMemo(() => {
        if (!state.activeShelf) return state.books
        return state.books.filter((b) =>
            state.shelves.find((s) => s.id === state.activeShelf)?.bookIds.includes(b.localId),
        )
    })

    return (
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 mx-6 sm:mx-0">
            <For each={visibleBooks()}>
                {(b) => (
                    <div class="relative group hover:opacity-70">
                        <A href={`/reader/${b.localId}`}>
                            <div class="card-theme rounded-lg shadow-md hover:shadow-lg overflow-hidden">
                                <img
                                    src={state.covers[b.localId]}
                                    alt={b.title}
                                    class="aspect-[3/4] w-full object-cover"
                                />
                                <button
                                    class="button absolute cursor-pointer top-2 right-11 w-8 h-8 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        props.onSelectBook(b)
                                    }}
                                >
                                    <IconFolderOpen />
                                </button>
                                <button
                                    class="button absolute cursor-pointer top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 border-none hover:ring-2 hover:ring-(--base08) rounded-full flex items-center justify-center transition-opacity"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        props.onDeleteBook(b)
                                    }}
                                >
                                    <IconTrash />
                                </button>
                                <div class="px-3 py-2">
                                    <p class="text-sm truncate">{b.title}</p>
                                    <progress
                                        class="progress-theme w-full h-2 rounded"
                                        value={b.currChars}
                                        max={b.totalChars}
                                    />
                                </div>
                            </div>
                        </A>
                    </div>
                )}
            </For>
        </div>
    )
}
