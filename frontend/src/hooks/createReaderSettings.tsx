import { lsReader } from "@/services/localStorage"
import { createSignal, onCleanup, onMount } from "solid-js"

const initial = {
    fontSize: Math.max(lsReader.fontSize(), 1),
    lineHeight: Math.max(lsReader.lineHeight(), 1),
    verticalPadding: Math.max(lsReader.verticalPadding(), 0),
    horizontalPadding: Math.max(lsReader.horizontalPadding(), 0),
    vertical: lsReader.vertical(),
    paginated: lsReader.paginated(),
    showFurigana: lsReader.showFurigana(),
    disableCss: lsReader.disableCssInjection(),
}
const [settings, setSettings] = createSignal(initial)

/**
 * Creates and manages reader settings, syncing with localStorage and reflecting
 * changes in CSS variables. Saves are automatically updated on the local storage.
 *
 * @param [autoReflectChanges=true] default true. update the css after any change
 */
export function createReaderSettings(injectCss: boolean = false) {
    const [tempSettings, setTempSettings] = createSignal(settings())

    function setReaderSetting<K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) {
        switch (key) {
            case "fontSize":
                lsReader.setFontSize(value as number)
                break
            case "lineHeight":
                lsReader.setLineHeight(value as number)
                break
            case "verticalPadding":
                lsReader.setVerticalPadding(value as number)
                break
            case "horizontalPadding":
                lsReader.setHorizontalPadding(value as number)
                break
            case "vertical":
                lsReader.setVertical(value as boolean)
                break
            case "paginated":
                lsReader.setPaginated(value as boolean)
                break
            case "showFurigana":
                lsReader.setShowFurigana(value as boolean)
                break
            case "disableCss":
                lsReader.setDisableCssInjection(value as boolean)
                break
        }
        setTempSettings((prev) => ({ ...prev, [key]: value }))
    }

    function reflectSettings() {
        setSettings(tempSettings())

        document.documentElement.style.setProperty("--reader-font-size", `${settings().fontSize}px`)
        document.documentElement.style.setProperty("--reader-line-height", `${settings().lineHeight}`)
        document.documentElement.style.setProperty("--reader-vertical-padding", `${100 - settings().verticalPadding}%`)
        document.documentElement.style.setProperty(
            "--reader-horizontal-padding",
            `${100 - settings().horizontalPadding}%`,
        )
    }

    if (injectCss) {
        onMount(() => reflectSettings())
    }

    onCleanup(() => {
        document.documentElement.style.removeProperty("--reader-font-size")
        document.documentElement.style.removeProperty("--reader-line-height")
        document.documentElement.style.removeProperty("--reader-vertical-padding")
        document.documentElement.style.removeProperty("--reader-horizontal-padding")
    })

    return [settings, setReaderSetting, reflectSettings] as const
}
