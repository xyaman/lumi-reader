import { For, Show } from "solid-js"
import { useThemeContext } from "../context/theme"
import { ITheme } from "../theme"

export default function ThemeList(props: {
    selectOnly?: boolean
    onEdit?: (theme: ITheme) => void
}) {
    const { selectedTheme, selectTheme, allThemes, deleteTheme, duplicateTheme } = useThemeContext()
    const isDefaultTheme = (scheme: string) =>
        allThemes().some((t) => t.scheme === scheme && t.author === "lumireader")

    return (
        <div>
            <h3 class="text-lg font-medium mb-2">Available Themes</h3>
            <For each={allThemes()}>
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
                                onClick={() => selectTheme(theme.scheme)}
                                disabled={selectedTheme() === theme.scheme}
                            >
                                {selectedTheme() === theme.scheme ? "Selected" : "Select"}
                            </button>
                            <Show when={!props.selectOnly}>
                                <button
                                    class="ml-2 text-sm text-green-400 hover:underline"
                                    onClick={() => duplicateTheme(theme)}
                                >
                                    Duplicate
                                </button>
                            </Show>
                            <Show when={!isDefaultTheme(theme.scheme) && !props.selectOnly}>
                                <button
                                    class="ml-2 text-sm text-yellow-400 hover:underline"
                                    onClick={() => props.onEdit?.(theme)}
                                >
                                    Edit
                                </button>
                                <button
                                    class="ml-2 text-sm text-red-400 hover:underline"
                                    onClick={() => deleteTheme(theme.scheme)}
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
