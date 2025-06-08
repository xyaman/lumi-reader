import { createSignal, Show } from "solid-js"
import {
    ITheme,
    getCustomThemes,
    saveCustomThemes,
    setGlobalTheme,
    getSelectedTheme,
} from "./theme"
import Navbar from "./components/Navbar"
import { IconExit, IconToc } from "./components/icons"
import { useNavigate } from "@solidjs/router"
import ThemeList from "./components/Themelist"
import ThemeEditor from "./components/ThemeEditor"

export default function ThemeSettings() {
    const navigate = useNavigate()

    // Sidebar/menu state
    const [selectedMenu, setSelectedMenu] = createSignal<"theme" | "reader">("theme")
    const [showSidebar, setShowSidebar] = createSignal(false)

    // Theme state
    const [customThemes, setCustomThemes] = createSignal<ITheme[]>(getCustomThemes())
    const [editorMode, setEditorMode] = createSignal<null | {
        mode: "create" | "edit"
        theme?: ITheme
    }>(null)

    const handleSaveTheme = (theme: ITheme, oldName?: string) => {
        let updated = getCustomThemes()
        if (editorMode()?.mode === "edit" && oldName) {
            updated = updated.map((t) => (t.scheme === oldName ? theme : t))
        } else {
            updated = [...updated, theme]
        }
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    const handleDuplicate = (theme: ITheme) => {
        const existing = getCustomThemes()
        let baseName = `${theme.scheme} (copy)`
        let name = baseName
        let count = 2
        while (existing.some((t) => t.scheme === name)) {
            name = `${theme.scheme} (copy ${count})`
            count++
        }
        const newTheme = { ...theme, scheme: name }
        const updated = [...existing, newTheme]
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    const handleRemoveTheme = (scheme: string) => {
        if (scheme == getSelectedTheme()) {
            setGlobalTheme("Minimal white")
        }
        const updated = getCustomThemes().filter((t) => t.scheme !== scheme)
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    return (
        <>
            <Navbar>
                <Navbar.Left>
                    <button class="md:hidden mr-4" onClick={() => setShowSidebar((prev) => !prev)}>
                        <IconToc />
                    </button>
                    <p class="font-semibold text-lg">Settings</p>
                </Navbar.Left>
                <Navbar.Right>
                    <button onClick={() => navigate("/")}>
                        <IconExit />
                    </button>
                </Navbar.Right>
            </Navbar>
            <div class="mt-12 flex flex-col md:flex-row min-h-screen">
                <aside
                    class={`navbar-theme w-full md:w-64 p-4 md:block ${showSidebar() ? "block" : "hidden"}`}
                >
                    <ul class="space-y-2">
                        <li>
                            <button
                                class={`w-full text-left font-medium rounded px-2 py-1 ${
                                    selectedMenu() === "theme"
                                        ? "bg-[var(--base02)] text-[var(--base07)]"
                                        : "text-[var(--base04)] hover:text-[var(--base07)]"
                                }`}
                                onClick={() => {
                                    setSelectedMenu("theme")
                                    setShowSidebar(false)
                                }}
                            >
                                Theme Settings
                            </button>
                        </li>
                        <li>
                            <button
                                class={`w-full text-left font-medium rounded px-2 py-1 ${
                                    selectedMenu() === "reader"
                                        ? "bg-[var(--base02)] text-[var(--base07)]"
                                        : "text-[var(--base04)] hover:text-[var(--base07)]"
                                }`}
                                onClick={() => {
                                    setSelectedMenu("reader")
                                    setShowSidebar(false)
                                }}
                            >
                                Reader Settings
                            </button>
                        </li>
                    </ul>
                </aside>
                <main class="flex-1 p-6 md:p-12">
                    <div class="max-w-4xl mx-auto space-y-12">
                        <Show when={selectedMenu() === "theme"}>
                            <section>
                                <h2 class="text-2xl font-semibold mb-4">Theme Settings</h2>
                                <Show
                                    when={!editorMode()}
                                    fallback={
                                        <ThemeEditor
                                            onClose={() => setEditorMode(null)}
                                            initialTheme={editorMode()?.theme}
                                            mode={editorMode()?.mode}
                                            onSave={handleSaveTheme}
                                        />
                                    }
                                >
                                    <>
                                        <button
                                            class="button-theme-alt cursor-pointer px-4 py-2 mt-2 mb-4 rounded-lg"
                                            onClick={() => setEditorMode({ mode: "create" })}
                                        >
                                            + New Theme
                                        </button>
                                        <ThemeList
                                            customThemes={customThemes()}
                                            onRemove={handleRemoveTheme}
                                            onDuplicate={handleDuplicate}
                                            onEdit={(theme) =>
                                                setEditorMode({ mode: "edit", theme })
                                            }
                                        />
                                    </>
                                </Show>
                            </section>
                        </Show>
                        <Show when={selectedMenu() === "reader"}>
                            <section>
                                <h2 class="text-2xl font-semibold">Reader Settings</h2>
                            </section>
                        </Show>
                    </div>
                </main>
            </div>
        </>
    )
}
