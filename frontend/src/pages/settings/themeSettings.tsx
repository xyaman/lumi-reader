import { createSignal, Show } from "solid-js"
import ThemeList from "@/components/settings/Themelist"
import ThemeEditor from "@/components/settings/ThemeEditor"
import { ThemeProvider } from "@/context/theme"
import { Button } from "@/ui"
import { ITheme } from "@/theme"

export function ThemeSettings() {
    // Theme state
    const [editorMode, setEditorMode] = createSignal<null | {
        mode: "create" | "edit"
        theme?: ITheme
    }>(null)

    return (
        <ThemeProvider>
            <section>
                <h2 class="text-2xl font-semibold mb-4">Theme Settings</h2>
                <Show
                    when={!editorMode()}
                    fallback={
                        <ThemeEditor
                            onClose={() => setEditorMode(null)}
                            initialTheme={editorMode()?.theme}
                            mode={editorMode()?.mode}
                        />
                    }
                >
                    <>
                        <Button classList={{ "mb-2": true }} onClick={() => setEditorMode({ mode: "create" })}>
                            + New Theme
                        </Button>
                        <ThemeList onEdit={(theme) => setEditorMode({ mode: "edit", theme })} />
                    </>
                </Show>
            </section>
        </ThemeProvider>
    )
}
