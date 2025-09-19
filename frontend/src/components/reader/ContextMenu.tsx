import { createEffect, onCleanup, Show } from "solid-js"
import { useReaderState } from "@/context/reader"

export type ContextMenuProps = {
    menuState: { visible: boolean; x: number; y: number; target: HTMLElement | null }
    onClose: () => void
}

export function ContextMenu(props: ContextMenuProps) {
    let menuRef: HTMLDivElement

    const state = useReaderState()
    const isBookmarked = (p: HTMLElement | null): boolean => {
        if (!p) return false
        const index = Number(p.getAttribute("index"))
        return state.book.bookmarks.some((b) => b.paragraphId === index)
    }
    const toggleBookmark = (id: number | string, content: string) => {
        const idNum = Number(id)
        const idx = state.book.bookmarks.findIndex((b) => b.paragraphId === idNum)
        if (idx !== -1) {
            state.book.bookmarks.splice(idx, 1)
            return true
        } else {
            state.book.bookmarks.push({
                paragraphId: idNum,
                sectionName: state.book.sections[state.currSection].name,
                content,
            })
            return false
        }
    }

    createEffect(() => {
        if (!props.menuState.visible) return
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef && !menuRef.contains(event.target as Node)) {
                props.onClose()
            }
        }

        let target = props.menuState.target
        if (target) target.style.backgroundColor = "var(--base03) !important"
        document.addEventListener("click", handleClickOutside, { capture: true })
        onCleanup(() => {
            target?.style.removeProperty("background-color")
            document.removeEventListener("click", handleClickOutside, { capture: true })
        })
    })

    const handleCopy = () => {
        const paragraphText = props.menuState.target?.textContent
        if (paragraphText) {
            navigator.clipboard.writeText(paragraphText)
        }
        props.onClose()
    }

    const handleBookmark = () => {
        const p = props.menuState.target
        if (p) {
            const index = p.getAttribute("index")!
            const removed = toggleBookmark(Number(index), p.textContent!)
            const bgcolor = "bg-base01"
            removed ? p.classList.remove(bgcolor) : p.classList.add(bgcolor)
            state.book.save()
        }
        props.onClose()
    }

    return (
        <Show when={props.menuState.visible}>
            <div
                ref={(ref) => (menuRef = ref)}
                class="fixed z-50 flex flex-col rounded-lg border border-base03 bg-base01 bg-opacity-90 p-2 text-base05 shadow-lg backdrop-blur-sm"
                style={{
                    top: `${props.menuState.y}px`,
                    left: `${props.menuState.x}px`,
                }}
            >
                <button onClick={handleCopy} class="rounded px-4 py-2 text-left hover:bg-base02">
                    Copy
                </button>
                <button onClick={handleBookmark} class="rounded px-4 py-2 text-left hover:bg-base02">
                    {isBookmarked(props.menuState.target!) ? "Remove Bookmark" : "Add Bookmark"}
                </button>
            </div>
        </Show>
    )
}
