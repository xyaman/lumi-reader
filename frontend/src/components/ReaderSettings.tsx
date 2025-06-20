import { createSignal, createEffect, Show, onMount } from "solid-js"

/**
 * Updates the reader's CSS variables and persists settings to localStorage.
 */
function updateReaderStyle(
    fontSize: number,
    lineHeight: number | string,
    verticalPadding: number,
    horizontalPadding: number,
) {
    const fixedFontSize = Math.max(1, fontSize)
    document.documentElement.style.setProperty("--reader-font-size", `${fixedFontSize}px`)
    document.documentElement.style.setProperty("--reader-line-height", `${lineHeight}`)
    document.documentElement.style.setProperty(
        "--reader-vertical-padding",
        `${100 - verticalPadding}vh`,
    )
    document.documentElement.style.setProperty(
        "--reader-horizontal-padding",
        `${100 - horizontalPadding}vw`,
    )

    localStorage.setItem("reader:fontSize", String(fontSize))
    localStorage.setItem("reader:lineHeight", String(lineHeight))
    localStorage.setItem("reader:verticalPadding", String(verticalPadding))
    localStorage.setItem("reader:horizontalPadding", String(horizontalPadding))
}

/**
 * Props for ReaderSettings component.
 * @property onSave Optional callback when settings are saved. Should be set when using the component outside `Settings.tsx`
 */
type Props = {
    onSave?: (isVertical: boolean, isPaginated: boolean, padding: boolean) => void
}

/**
 * ReaderSettings component for adjusting reader appearance and behavior.
 */
export default function ReaderSettings(props: Props) {
    const [draftStyle, setDraftStyle] = createSignal({
        fontSize: Number(localStorage.getItem("reader:fontSize") ?? 20),
        lineHeight: localStorage.getItem("reader:lineHeight") ?? "1.5",
        verticalPadding: Number(localStorage.getItem("reader:verticalPadding") ?? 0),
        horizontalPadding: Number(localStorage.getItem("reader:horizontalPadding") ?? 5),
    })

    const [draftVertical, setDraftVertical] = createSignal(
        localStorage.getItem("reader:vertical") === "true",
    )
    const [draftPaginated, setDraftPaginated] = createSignal(
        localStorage.getItem("reader:paginated") === "true",
    )

    // On mount, sync state to localStorage and update styles
    onMount(() => {
        const { fontSize, lineHeight, verticalPadding, horizontalPadding } = draftStyle()
        const isVertical = draftVertical()
        const isPaginated = draftPaginated()

        localStorage.setItem("reader:vertical", String(isVertical))
        localStorage.setItem("reader:paginated", String(isPaginated))
        updateReaderStyle(fontSize, lineHeight, verticalPadding, horizontalPadding)
    })

    // Auto-save changes to localStorage and update styles if no onSave prop
    createEffect(() => {
        if (props.onSave) return

        const { fontSize, lineHeight, verticalPadding, horizontalPadding } = draftStyle()
        const isVertical = draftVertical()
        const isPaginated = draftPaginated()

        localStorage.setItem("reader:vertical", String(isVertical))
        localStorage.setItem("reader:paginated", String(isPaginated))
        updateReaderStyle(fontSize, lineHeight, verticalPadding, horizontalPadding)
    })

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
                <div>
                    <label class="block text-sm font-medium">Vertical Padding (%)</label>
                    <input
                        value={draftStyle().verticalPadding}
                        onInput={(e) =>
                            setDraftStyle((prev) => ({
                                ...prev,
                                verticalPadding: Number(e.currentTarget.value),
                            }))
                        }
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium">Horizontal Padding (%)</label>
                    <input
                        value={draftStyle().horizontalPadding}
                        onInput={(e) =>
                            setDraftStyle((prev) => ({
                                ...prev,
                                horizontalPadding: Number(e.currentTarget.value),
                            }))
                        }
                    />
                </div>
            </div>
            <Show when={props.onSave}>
                <button
                    onClick={() => {
                        const { fontSize, lineHeight, verticalPadding, horizontalPadding } =
                            draftStyle()
                        const isVertical = draftVertical()
                        const isPaginated = draftPaginated()
                        const paddingChanged =
                            verticalPadding !==
                                Number(localStorage.getItem("reader:verticalPadding") ?? 0) ||
                            horizontalPadding !==
                                Number(localStorage.getItem("reader:horizontalPadding") ?? 5)

                        // save new values in local storage
                        localStorage.setItem("reader:vertical", String(isVertical))
                        localStorage.setItem("reader:paginated", String(isPaginated))
                        updateReaderStyle(fontSize, lineHeight, verticalPadding, horizontalPadding)

                        props.onSave?.(isVertical, isPaginated, paddingChanged)
                    }}
                    class="button-theme cursor-pointer px-4 py-2 rounded-lg"
                >
                    Save
                </button>
            </Show>
        </div>
    )
}
