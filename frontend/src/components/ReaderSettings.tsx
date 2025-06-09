import { createSignal } from "solid-js"

type Props = {
    onSave: (
        fontSize: number,
        lineHeight: string,
        isVertical: boolean,
        isPaginated: boolean,
    ) => void
}

export default function ReaderSettings(props: Props) {
    const [draftStyle, setDraftStyle] = createSignal({
        fontSize: Number(localStorage.getItem("reader:fontSize") ?? 20),
        lineHeight: localStorage.getItem("reader:lineHeight") ?? "1.5",
    })

    const [draftVertical, setDraftVertical] = createSignal(
        localStorage.getItem("reader:vertical") === "true",
    )
    const [draftPaginated, setDraftPaginated] = createSignal(
        localStorage.getItem("reader:paginated") === "true",
    )

    return (
        <div>
            <div>
                <label class="block text-sm font-medium">Font Size (px)</label>
                <input
                    value={draftStyle().fontSize}
                    onInput={(e) =>
                        setDraftStyle((prev) => ({
                            ...prev,
                            fontSize: Number(e.currentTarget.value),
                        }))
                    }
                />
            </div>
            <div>
                <label class="block text-sm font-medium">Line Height (unitless)</label>
                <input
                    value={draftStyle().lineHeight}
                    onInput={(e) =>
                        setDraftStyle((prev) => ({
                            ...prev,
                            lineHeight: e.currentTarget.value,
                        }))
                    }
                />
            </div>
            <hr />
            <div class="space-y-4">
                <p class="font-bold text-sm">
                    *These options will reload the reader. Unsaved progress will be lost.
                </p>
                <div class="flex items-center space-x-2">
                    <input
                        id="vertical-checkbox"
                        type="checkbox"
                        checked={draftVertical()}
                        onInput={(e) => setDraftVertical(e.currentTarget.checked)}
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
                        checked={draftPaginated()}
                        onInput={(e) => setDraftPaginated(e.currentTarget.checked)}
                        class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                    />
                    <label for="paginated-checkbox" class="text-sm font-medium">
                        Simulate Pages
                    </label>
                </div>
            </div>
            <button
                onClick={() => {
                    const { fontSize, lineHeight } = draftStyle()
                    props.onSave(fontSize, lineHeight, draftVertical(), draftPaginated())
                    // const changed =
                    //     isVertical !== draftVertical() || isPaginated !== draftPaginated()
                    // localStorage.setItem("reader:vertical", String(draftVertical()))
                    // localStorage.setItem("reader:paginated", String(draftPaginated()))
                    // if (changed) location.reload()
                    // setSettingsOpen(false)
                }}
                class="button-theme px-4 py-2 rounded-lg"
            >
                Save
            </button>
        </div>
    )
}
