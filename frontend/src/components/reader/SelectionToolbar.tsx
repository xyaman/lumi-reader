import { createEffect, createSignal, onCleanup, Show } from "solid-js"
import type { JSX } from "solid-js"
import { useReaderState } from "@/context/reader"
import { Button } from "@/ui/button"
import { errorToast, infoToast } from "@/ui/toast"

type SelectionState = {
    visible: boolean
    rect: DOMRect | null
    paragraphId: number | null
}

export function SelectionToolbar() {
    const state = useReaderState()
    const [selection, setSelection] = createSignal<SelectionState>({
        visible: false,
        rect: null,
        paragraphId: null,
    })
    const [highlightedId, setHighlightedId] = createSignal<number | null>(null)

    const clearHighlight = () => {
        const prevId = highlightedId()
        if (prevId !== null) {
            const prevP = document.querySelector(`p[index="${prevId}"]`) as HTMLElement | null
            prevP?.style.removeProperty("background-color")
            setHighlightedId(null)
        }
    }

    // Finds bookmark index by paragraph id
    const getBookmarkIndex = (id: number): number => state.book.bookmarks.findIndex((b) => b.paragraphId === id)

    const isBookmarked = () => {
        const id = selection().paragraphId
        return id !== null && getBookmarkIndex(id) !== -1
    }

    const showToolbarForSelection = () => {
        const selectionObj = document.getSelection()
        if (!selectionObj || selectionObj.isCollapsed || !selectionObj.rangeCount) return false

        // Check if selection spans multiple paragraphs - only reject if BOTH are found AND different
        const anchorParagraph = selectionObj.anchorNode?.parentElement?.closest?.("p[index]") as HTMLElement | null
        const focusParagraph = selectionObj.focusNode?.parentElement?.closest?.("p[index]") as HTMLElement | null
        if (anchorParagraph && focusParagraph && anchorParagraph !== focusParagraph) return false

        // Use focusParagraph if available, otherwise fallback to anchorParagraph
        const paragraph = focusParagraph || anchorParagraph
        if (!paragraph) return false

        const range = selectionObj.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        const paragraphId = Number(paragraph.getAttribute("index"))

        // Clear previous highlight if different paragraph
        const prevId = highlightedId()
        if (prevId !== null && prevId !== paragraphId) {
            // @Todo(xyaman): I don't want to use query selector
            const prevP = document.querySelector(`p[index="${prevId}"]`) as HTMLElement | null
            prevP?.style.removeProperty("background-color")
        }

        // Add new highlight
        paragraph.style.backgroundColor = "var(--base03) !important"
        setHighlightedId(paragraphId)

        setSelection({ visible: true, rect, paragraphId })
        return true
    }

    const handleSelectionChange = () => {
        const found = showToolbarForSelection()
        if (!found) {
            clearHighlight()
            setSelection((prev) => ({ ...prev, visible: false }))
        }
    }

    const toggleBookmark = () => {
        const { paragraphId } = selection()
        if (paragraphId === null) return

        const paragraph = document.querySelector(`p[index="${paragraphId}"]`) as HTMLElement | null
        const text = paragraph?.textContent ?? ""
        const bgcolor = "bg-base01"

        const idx = getBookmarkIndex(paragraphId)
        if (idx !== -1) {
            state.book.bookmarks.splice(idx, 1)
            paragraph?.classList.remove(bgcolor)
        } else {
            state.book.bookmarks.push({
                paragraphId,
                sectionName: state.book.sections[state.currSection].name,
                content: text,
            })
            paragraph?.classList.add(bgcolor)
        }
        state.book.save()
        clearHighlight()
        setSelection((prev) => ({ ...prev, visible: false }))
    }

    const handleCopy = () => {
        const paragraphId = selection().paragraphId
        if (paragraphId === null) {
            errorToast("No paragraph selected")
            return
        }

        const paragraph = document.querySelector(`p[index="${paragraphId}"]`)
        const text = paragraph?.textContent ?? ""

        if (!text) {
            errorToast("No content to copy")
            return
        }

        navigator.clipboard.writeText(text)
            .then(() => infoToast("Copied to clipboard"))
            .catch(() => errorToast("Failed to copy"))

        clearHighlight()
        setSelection((prev) => ({ ...prev, visible: false }))
    }

    createEffect(() => {
        document.addEventListener("selectionchange", handleSelectionChange)
        document.addEventListener("scroll", () => setSelection((prev) => ({ ...prev, visible: false })), true)

        onCleanup(() => {
            document.removeEventListener("selectionchange", handleSelectionChange)
            document.removeEventListener("scroll", () => setSelection((prev) => ({ ...prev, visible: false })), true)
        })
    })

    const toolbarStyle = (): JSX.CSSProperties => {
        const rect = selection().rect
        if (!rect) return { display: "none" }

        const toolbarHeight = 44
        const gap = 8

        let top = rect.top - toolbarHeight - gap + window.scrollY
        const left = rect.left + rect.width / 2 + window.scrollX

        if (top < window.scrollY + 20) {
            top = rect.bottom + gap + window.scrollY
        }

        return {
            position: "absolute",
            top: `${top}px`,
            left: `${left}px`,
            transform: "translateX(-50%)",
            "z-index": 50,
        }
    }

    return (
        <Show when={selection().visible}>
            <div
                id="selection-toolbar"
                class="flex gap-1 rounded-lg border border-base03 bg-base01 bg-opacity-95 p-1 shadow-lg backdrop-blur-sm"
                style={toolbarStyle()}
            >
                <Button size="sm" onClick={handleCopy}>
                    Copy
                </Button>
                <Button size="sm" onClick={toggleBookmark}>
                    {isBookmarked() ? "Remove Bookmark" : "Bookmark"}
                </Button>
            </div>
        </Show>
    )
}
