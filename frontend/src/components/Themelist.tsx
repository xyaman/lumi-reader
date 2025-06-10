import { For, Show } from "solid-js"
import { useThemeContext } from "@/context/theme"
import { ITheme } from "@/theme"
import { IconDuplicate, IconEdit, IconTrash } from "@/components/icons"

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
                        onClick={() => selectTheme(theme.scheme)}
                    >
                        <p class="cursor-pointer">
                            {theme.scheme}
                            <Show when={!props.selectOnly}>
                                <span class="text-xs text-[var(--base03)]"> {theme.author}</span>
                            </Show>
                        </p>
                        <div class="flex gap-2">
                            <Show when={!props.selectOnly}>
                                <button
                                    class="ml-2 text-sm text-[var(--base05)] cursor-pointer"
                                    onClick={() => duplicateTheme(theme)}
                                >
                                    <IconDuplicate />
                                </button>
                            </Show>
                            <Show when={!isDefaultTheme(theme.scheme) && !props.selectOnly}>
                                <button
                                    class="ml-2 text-sm text-[var(--base05)] cursor-pointer"
                                    onClick={() => props.onEdit?.(theme)}
                                >
                                    <IconEdit />
                                </button>
                                <button
                                    class="ml-2 text-sm text-[var(--base05)] cursor-pointer"
                                    onClick={() => deleteTheme(theme.scheme)}
                                >
                                    <IconTrash />
                                </button>
                            </Show>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
