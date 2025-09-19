import { lsReader } from "@/services/localStorage"
import { createEffect, createSignal, on, onMount } from "solid-js"

const initial = {
    fontSize: Math.max(lsReader.fontSize(), 1),
    lineHeight: Math.max(lsReader.lineHeight(), 1),
    fontFamily: lsReader.fontFamily(),
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
export function createReaderSettings(injectCss: boolean = false, autoReflectChanges: boolean = false) {
    const [tempSettings, setTempSettings] = createSignal(settings())

    function setReaderSetting<K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) {
        switch (key) {
            case "fontSize":
                lsReader.setFontSize(value as number)
                break
            case "lineHeight":
                lsReader.setLineHeight(value as number)
                break
            case "fontFamily":
                const newvalue = value !== "__default__" ? value : null
                lsReader.setFontFamily(newvalue as string)
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
    }

    if (injectCss) {
        onMount(() => reflectSettings())
    }

    if (autoReflectChanges) {
        createEffect(on(tempSettings, () => reflectSettings()))
    }

    return [settings, setReaderSetting, reflectSettings] as const
}
