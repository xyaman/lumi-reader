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
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <For each={visibleBooks()}>
                {/* Card */}
                {(b) => (
                    <div class="relative group">
                        <A href={`/reader/${b.localId}`}>
                            <div class="bg-base01 shadow-lg hover:shadow-xl transition-shadow rounded overflow-hidden">
                                <img
                                    src={state.covers[b.localId]}
                                    alt={b.title}
                                    class="w-full h-48 object-cover"
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
                                <div class="p-3">
                                    <p class="font-semibold truncate">{b.title}</p>
                                    <p class="text-sm text-base04 truncate">{b.creator}</p>
                                    <div class="bg-base02 w-full rounded mt-2">
                                        <div
                                            class="bg-base0D h-[4px] rounded"
                                            style={{
                                                width: `${Math.floor((100 * b.currChars) / b.totalChars)}%`,
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </A>
                    </div>
                )}
            </For>
        </div>
    )
}
