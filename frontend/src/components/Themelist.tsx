import { ITheme, defaultThemes, setGlobalTheme, getSelectedTheme } from "../theme"
import { createSignal, For, Show } from "solid-js"

export default function ThemeList(props: {
    customThemes: ITheme[]
    onRemove?: (name: string) => void
    onEdit?: (theme: ITheme) => void
    onDuplicate?: (theme: ITheme) => void
}) {
    const [selectedTheme, setSelectedTheme] = createSignal(getSelectedTheme())

    const handleSelect = (name: string) => {
        setSelectedTheme(name)
        setGlobalTheme(name)
    }

    // Helper to check if a theme is default
    const isDefaultTheme = (scheme: string) => defaultThemes.some((t) => t.scheme === scheme)

    return (
        <div>
            <h3 class="text-lg font-medium mb-2">Available Themes</h3>
            <For each={[...defaultThemes, ...props.customThemes]}>
                {(theme) => (
                    <div
                        class={`flex items-center justify-between p-3 my-2 rounded border ${
                            selectedTheme() === theme.scheme ? "border-blue-600" : "border-zinc-600"
                        }`}
                    >
                        <span>{theme.scheme}</span>
                        <div class="flex gap-2">
                            <button
                                class="ml-2 text-sm text-blue-400 hover:underline"
                                onClick={() => handleSelect(theme.scheme)}
                                disabled={selectedTheme() === theme.scheme}
                            >
                                {selectedTheme() === theme.scheme ? "Selected" : "Select"}
                            </button>
                            {/* Duplicate button for all themes */}
                            <Show when={props.onDuplicate !== undefined}>
                                <button
                                    class="ml-2 text-sm text-green-400 hover:underline"
                                    onClick={() => props.onDuplicate?.(theme)}
                                >
                                    Duplicate
                                </button>
                            </Show>
                            {/* Only show edit/remove for custom themes */}
                            <Show when={!isDefaultTheme(theme.scheme) && props.onEdit}>
                                <button
                                    class="ml-2 text-sm text-yellow-400 hover:underline"
                                    onClick={() => props.onEdit?.(theme)}
                                >
                                    Edit
                                </button>
                            </Show>
                            <Show when={!isDefaultTheme(theme.scheme) && props.onRemove}>
                                <button
                                    class="ml-2 text-sm text-red-400 hover:underline"
                                    onClick={() => {
                                        if (theme.scheme == getSelectedTheme()) {
                                            setSelectedTheme("Minimal white")
                                        }
                                        props.onRemove?.(theme.scheme)
                                    }}
                                >
                                    Remove
                                </button>
                            </Show>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
