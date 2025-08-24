import { useReaderState } from "@/context/reader"
import { createSignal } from "solid-js"

// CharacterCounter toggles visibility on click, always clickable
export function CharacterCounter() {
    const [show, setShow] = createSignal(true)
    const readerState = useReaderState()
    const currPercentage = () => ((100 * readerState.currChars) / readerState.book.totalChars).toFixed(2)

    return (
        <span
            class="z-10 right-[0.5rem] bottom-[0.5rem] fixed text-[0.75rem] cursor-pointer"
            onClick={() => setShow((prev) => !prev)}
        >
            {show() ? (
                `${readerState.currChars}/${readerState.book.totalChars} (${currPercentage()}%)`
            ) : (
                <span class="opacity-20">Show counter</span>
            )}
        </span>
    )
}
