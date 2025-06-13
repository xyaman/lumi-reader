import { useReaderContext } from "@/context/reader"
import { createEffect, createSignal, For } from "solid-js"

/**
 * ReaderContent component displays the book content in the reader,
 * handling pagination and layout modes based on user settings.
 *
 * The Reader uses the following global CSS variables:
 * - --reader-vertical-padding
 * - --reader-horizontal-padding
 * - --reader-font-size
 * - --reader-line-height
 */
export default function ReaderContent() {
    const { book, readerStore, setReaderStore } = useReaderContext()

    let containerRef: HTMLDivElement | undefined

    // The lastest value is always in the local storage
    const [isPaginated, setIsPaginated] = createSignal(
        localStorage.getItem("reader:paginated") === "true",
    )
    const [isVertical, setIsVertical] = createSignal(
        localStorage.getItem("reader:paginated") === "true",
    )

    const containerClass = () =>
        !isPaginated()
            ? "px-8"
            : isVertical()
              ? "relative mx-auto w-[var(--reader-horizontal-padding)] h-[var(--reader-vertical-padding)] overflow-hidden snap-y snap-mandatory"
              : "relative mx-8 py-12 h-screen overflow-x-hidden snap-x snap-mandatory"

    const contentClass = () =>
        !isPaginated()
            ? isVertical()
                ? "writing-mode-vertical max-h-[98vh]"
                : "h-full"
            : isVertical()
              ? "h-full w-full [column-width:100vw] [column-fill:auto] [column-gap:0px] text-[20px] writing-mode-vertical"
              : "h-full [column-width:100vw] [column-fill:auto] [column-gap:0px]"

    // Update local state when settings changes
    // ref: `ReaderSettings.tsx`
    createEffect(() => {
        if (readerStore.shouldReload == true) {
            setIsPaginated(localStorage.getItem("reader:paginated") === "true")
            setIsVertical(localStorage.getItem("reader:vertical") === "true")
            setReaderStore("shouldReload", false)
        }
    })

    return (
        <div
            id="reader-container"
            ref={containerRef}
            class={containerClass()}
            onClick={() => {
                setReaderStore("sideBar", null)
                setReaderStore("navOpen", false)
            }}
        >
            <div
                id="reader-content"
                class={contentClass()}
                style="font-size: var(--reader-font-size); line-height: var(--reader-line-height);"
            >
                <For each={book?.manifest.xhtml}>
                    {(x) => {
                        return <div innerHTML={x.content} />
                    }}
                </For>
            </div>
        </div>
    )
}
