import { lsReader } from "@/services/localStorage"
import { onCleanup, onMount } from "solid-js"

export function useReaderSettings() {
    const fontSize = Math.max(lsReader.fontSize(), 1)
    const lineHeight = Math.max(lsReader.lineHeight(), 1)
    const verticalPadding = Math.max(lsReader.verticalPadding(), 0)
    const horizontalPadding = Math.max(lsReader.horizontalPadding(), 0)

    onMount(() => {
        document.documentElement.style.setProperty("--reader-font-size", `${fontSize}px`)
        document.documentElement.style.setProperty("--reader-line-height", `${lineHeight}`)
        document.documentElement.style.setProperty("--reader-vertical-padding", `${100 - verticalPadding}%`)
        document.documentElement.style.setProperty("--reader-horizontal-padding", `${100 - horizontalPadding}%`)
    })

    onCleanup(() => {
        document.documentElement.style.removeProperty("--reader-font-size")
        document.documentElement.style.removeProperty("--reader-line-height")
        document.documentElement.style.removeProperty("--reader-vertical-padding")
        document.documentElement.style.removeProperty("--reader-horizontal-padding")
    })

    return {
        fontSize,
        lineHeight,
        verticalPadding,
        horizontalPadding,
        vertical: lsReader.vertical(),
        paginated: lsReader.paginated(),
        showFurigana: lsReader.showFurigana(),
    }
}
