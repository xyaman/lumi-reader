import { lsReader } from "@/services/localStorage"
import { createStore } from "solid-js/store"

export interface IReaderSettings {
    fontSize: number
    lineHeight: number
    verticalPadding: number
    horizontalPadding: number
    vertical: boolean
    paginated: boolean
    showFurigana: boolean
}

// TODO: stop using this
function getInitialSettings(): IReaderSettings {
    return {
        fontSize: lsReader.fontSize(),
        lineHeight: lsReader.lineHeight(),
        verticalPadding: lsReader.verticalPadding(),
        horizontalPadding: lsReader.horizontalPadding(),
        vertical: lsReader.vertical(),
        paginated: lsReader.paginated(),
        showFurigana: lsReader.showFurigana(),
    }
}

export const [readerSettingsStore, setReaderSettingsStore] = createStore<IReaderSettings>(getInitialSettings())
