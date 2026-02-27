import { useReaderDispatch, useReaderState } from "@/context/reader"
import { createSignal, onCleanup, onMount, Show, For } from "solid-js"

export function KeymapManager() {
    const [modalOpen, setModalOpen] = createSignal(false)

    const readerState = useReaderState()
    const readerDispatch = useReaderDispatch()

    const keymaps = [
        {
            key: "?",
            description: "Show keymap help",
            action: () => setModalOpen(true),
        },
        {
            key: "b",
            description: "Go to last saved bookmark",
            action: () => {
                const bookmarks = readerState.book.bookmarks
                if (bookmarks.length === 0) return
                readerDispatch.bookmarkGoTo(bookmarks[bookmarks.length - 1])
            },
        },
    ]

    function handleKeydown(e: KeyboardEvent) {
        for (const km of keymaps) {
            if (e.key === km.key) {
                e.preventDefault()
                km.action()
                break
            }
        }
        if (e.key === "Escape" && modalOpen()) setModalOpen(false)
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown)
    })
    onCleanup(() => {
        window.removeEventListener("keydown", handleKeydown)
    })

    return (
        <Show when={modalOpen()}>
            <div
                class="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
                onClick={() => setModalOpen(false)}
            >
                <div
                    class="rounded p-6 min-w-[300px] shadow-lg bg-base01 text-base05"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h4 class="mb-4 font-bold text-lg text-base0D">Keyboard Shortcuts</h4>
                    <ul>
                        <For each={keymaps}>
                            {(km) => (
                                <li class="mb-2 flex items-center">
                                    <span class="font-mono px-2 py-1 rounded bg-base02 text-base0B">
                                        {km.key}
                                    </span>
                                    <span class="ml-2">{km.description}</span>
                                </li>
                            )}
                        </For>
                    </ul>
                    <button class="button-theme rounded mt-4 px-4 py-2" onClick={() => setModalOpen(false)}>
                        Close
                    </button>
                </div>
            </div>
        </Show>
    )
}
