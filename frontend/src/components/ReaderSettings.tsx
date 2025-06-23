import { createSignal, createEffect, Show, onMount } from "solid-js"

export interface ReaderSettings {
    fontSize: number
    lineHeight: number | string
    verticalPadding: number
    horizontalPadding: number
    vertical: boolean
    paginated: boolean
    showFurigana: boolean
}

function updateReaderStyle(settings: ReaderSettings) {
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

type Props = {
    onSave?: (settings: ReaderSettings) => void
}

export default function ReaderSettings(props: Props) {
    const [draftSettings, setDraftSettings] = createSignal<ReaderSettings>({
        fontSize: Number(localStorage.getItem("reader:fontSize") ?? 20),
        lineHeight: localStorage.getItem("reader:lineHeight") ?? "1.5",
        verticalPadding: Number(localStorage.getItem("reader:verticalPadding") ?? 0),
        horizontalPadding: Number(localStorage.getItem("reader:horizontalPadding") ?? 5),
        vertical: localStorage.getItem("reader:vertical") === "true",
        paginated: localStorage.getItem("reader:paginated") === "true",
        showFurigana: localStorage.getItem("reader:showFurigana") === "true",
    })

    // On mount, sync state to localStorage and update styles
    onMount(() => {
        const settings = draftSettings()
        localStorage.setItem("reader:vertical", String(settings.vertical))
        localStorage.setItem("reader:paginated", String(settings.paginated))
        updateReaderStyle(settings)
    })

    // Auto-save changes to localStorage and update styles if no onSave prop
    createEffect(() => {
        if (props.onSave) return

        const settings = draftSettings()
        localStorage.setItem("reader:vertical", String(settings.vertical))
        localStorage.setItem("reader:paginated", String(settings.paginated))
        updateReaderStyle(settings)
    })

    return (
        <div>
            <div>
                <label class="block text-sm font-medium">Font Size (px)</label>
                <input
                    value={draftSettings().fontSize}
                    onInput={(e) =>
                        setDraftSettings((prev) => ({
                            ...prev,
                            fontSize: Number(e.currentTarget.value),
                        }))
                    }
                />
            </div>
            <div>
                <label class="block text-sm font-medium">Line Height (unitless)</label>
                <input
                    value={draftSettings().lineHeight}
                    onInput={(e) =>
                        setDraftSettings((prev) => ({
                            ...prev,
                            lineHeight: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <hr />
            <br />
            <div class="space-y-4">
                <div class="flex items-center space-x-2">
                    <input
                        id="vertical-checkbox"
                        type="checkbox"
                        checked={draftSettings().vertical}
                        onInput={(e) =>
                            setDraftSettings((prev) => ({
                                ...prev,
                                vertical: e.currentTarget.checked,
                            }))
                        }
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
                        checked={draftSettings().paginated}
                        onInput={(e) =>
                            setDraftSettings((prev) => ({
                                ...prev,
                                paginated: e.currentTarget.checked,
                            }))
                        }
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
                        checked={draftSettings().showFurigana}
                        onInput={(e) => {
                            console.log(String(e.currentTarget.checked))
                            setDraftSettings((prev) => ({
                                ...prev,
                                showFurigana: e.currentTarget.checked,
                            }))
                        }}
                        class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                    />
                    <label for="furigana-checkbox" class="text-sm font-medium">
                        Show Furigana
                    </label>
                </div>
                <div>
                    <label class="block text-sm font-medium">Vertical Padding (%)</label>
                    <input
                        value={draftSettings().verticalPadding}
                        onInput={(e) =>
                            setDraftSettings((prev) => ({
                                ...prev,
                                verticalPadding: Number(e.currentTarget.value),
                            }))
                        }
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium">Horizontal Padding (%)</label>
                    <input
                        value={draftSettings().horizontalPadding}
                        onInput={(e) =>
                            setDraftSettings((prev) => ({
                                ...prev,
                                horizontalPadding: Number(e.currentTarget.value),
                            }))
                        }
                    />
                </div>
            </div>
            <Show when={props.onSave}>
                <br />
                <button
                    onClick={() => {
                        const settings = draftSettings()

                        const paddingChanged =
                            settings.verticalPadding !==
                                Number(localStorage.getItem("reader:verticalPadding") ?? 0) ||
                            settings.horizontalPadding !==
                                Number(localStorage.getItem("reader:horizontalPadding") ?? 5)

                        localStorage.setItem("reader:vertical", String(settings.vertical))
                        localStorage.setItem("reader:paginated", String(settings.paginated))
                        updateReaderStyle(settings)

                        props.onSave?.(settings.vertical, settings.paginated, paddingChanged)
                    }}
                    class="button-theme cursor-pointer px-4 py-2 rounded-lg"
                >
                    Save
                </button>
            </Show>
        </div>
    )
}
