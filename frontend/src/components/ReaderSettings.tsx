import { createEffect, Show, onMount } from "solid-js"
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

function updateReaderStyle(settings: IReaderSettings) {
    const fixedFontSize = Math.max(1, settings.fontSize)
    document.documentElement.style.setProperty("--reader-font-size", `${fixedFontSize}px`)
    document.documentElement.style.setProperty("--reader-line-height", `${settings.lineHeight}`)
    document.documentElement.style.setProperty(
        "--reader-vertical-padding",
        `${100 - settings.verticalPadding}vh`,
    )
    document.documentElement.style.setProperty(
        "--reader-horizontal-padding",
        `${100 - settings.horizontalPadding}vw`,
    )

    localStorage.setItem("reader:fontSize", String(settings.fontSize))
    localStorage.setItem("reader:lineHeight", String(settings.lineHeight))
    localStorage.setItem("reader:verticalPadding", String(settings.verticalPadding))
    localStorage.setItem("reader:horizontalPadding", String(settings.horizontalPadding))
    localStorage.setItem("reader:showFurigana", String(settings.showFurigana))
}

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

export const [readerSettingsStore, setReaderSettingsStore] =
    createStore<IReaderSettings>(getInitialSettings())

type Props = {
    saveButton?: boolean
}

export default function ReaderSettings(props: Props) {
    // Local draft state
    const [draft, setDraft] = createStore<IReaderSettings>({ ...readerSettingsStore })

    // Sync store to localStorage and styles on mount
    onMount(() => updateReaderStyle(readerSettingsStore))

    // If onSave is not set, sync draft to store and styles immediately
    createEffect(() => {
        if (!props.saveButton) {
            setReaderSettingsStore({ ...draft })
            updateReaderStyle(draft)
        }
    })

    return (
        <div>
            <div>
                <label class="block text-sm font-medium">Font Size (px)</label>
                <input
                    value={draft.fontSize}
                    onInput={(e) => setDraft("fontSize", Number(e.currentTarget.value))}
                />
            </div>
            <div>
                <label class="block text-sm font-medium">Line Height (unitless)</label>
                <input
                    value={draft.lineHeight}
                    onInput={(e) => setDraft("lineHeight", e.currentTarget.value)}
                />
            </div>
            <hr />
            <br />
            <div class="space-y-4">
                <div class="flex items-center space-x-2">
                    <input
                        id="vertical-checkbox"
                        type="checkbox"
                        checked={draft.vertical}
                        onInput={(e) => setDraft("vertical", e.currentTarget.checked)}
                        class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                    />
                    <label for="vertical-checkbox" class="text-sm font-medium">
                        Vertical Reading
                    </label>
                </div>
                <div class="flex items-center space-x-2">
                    <input
                        id="paginated-checkbox"
                        type="checkbox"
                        checked={draft.paginated}
                        onInput={(e) => setDraft("paginated", e.currentTarget.checked)}
                        class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                    />
                    <label for="paginated-checkbox" class="text-sm font-medium">
                        Simulate Pages
                    </label>
                </div>
                <div class="flex items-center space-x-2">
                    <input
                        id="furigana-checkbox"
                        type="checkbox"
                        checked={draft.showFurigana}
                        onInput={(e) => setDraft("showFurigana", e.currentTarget.checked)}
                        class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                    />
                    <label for="furigana-checkbox" class="text-sm font-medium">
                        Show Furigana
                    </label>
                </div>
                <div>
                    <label class="block text-sm font-medium">Vertical Padding (%)</label>
                    <input
                        value={draft.verticalPadding}
                        onInput={(e) => setDraft("verticalPadding", Number(e.currentTarget.value))}
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium">Horizontal Padding (%)</label>
                    <input
                        value={draft.horizontalPadding}
                        onInput={(e) =>
                            setDraft("horizontalPadding", Number(e.currentTarget.value))
                        }
                    />
                </div>
            </div>
            <Show when={props.saveButton}>
                <br />
                <button
                    onClick={() => {
                        setReaderSettingsStore({ ...draft })
                        updateReaderStyle(draft)
                    }}
                    class="button-theme cursor-pointer px-4 py-2 rounded-lg"
                >
                    Save
                </button>
            </Show>
        </div>
    )
}
