import { createStore } from "solid-js/store"

export interface IReaderSettings {
    fontSize: number
    lineHeight: number | string
    verticalPadding: number
    horizontalPadding: number
    vertical: boolean
    paginated: boolean
    showFurigana: boolean
}

// TODO: stop using this
function getInitialSettings(): IReaderSettings {
    return {
        fontSize: Number(localStorage.getItem("reader:fontSize") ?? 20),
        lineHeight: localStorage.getItem("reader:lineHeight") ?? "1.5",
        verticalPadding: Number(localStorage.getItem("reader:verticalPadding") ?? 10),
        horizontalPadding: Number(localStorage.getItem("reader:horizontalPadding") ?? 10),
        vertical: localStorage.getItem("reader:vertical") === "true",
        paginated: localStorage.getItem("reader:paginated") === "true",
        showFurigana: localStorage.getItem("reader:showFurigana") === "true",
    }
}

export const [readerSettingsStore, setReaderSettingsStore] = createStore<IReaderSettings>(getInitialSettings())
