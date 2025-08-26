import { For, Show } from "solid-js"
import { ITheme } from "@/lib/theme"
import { IconDuplicate, IconEdit, IconTrash } from "@/components/icons"
import { useThemeDispatch, useThemeState } from "@/context/theme"

export default function ThemeList(props: { selectOnly?: boolean; onEdit?: (theme: ITheme) => void }) {
    const themeState = useThemeState()
    const themeDispatch = useThemeDispatch()

    const isDefaultTheme = (scheme: string) =>
        themeState.allThemes.some((t) => t.scheme === scheme && t.author === "lumireader")

    return (
        <div>
            <h3 class="text-lg font-medium mb-2">Available Themes</h3>
            <For each={themeState.allThemes}>
                {(theme) => (
                    <div
                        class={`flex items-center justify-between p-3 my-2 rounded border ${
                            themeState.selectedTheme === theme.scheme ? "border-blue-600" : "border-zinc-600"
                        }`}
                        onClick={() => themeDispatch.selectTheme(theme.scheme)}
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
                                    onClick={() => themeDispatch.duplicateTheme(theme)}
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
                                    onClick={() => themeDispatch.deleteTheme(theme.scheme)}
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
