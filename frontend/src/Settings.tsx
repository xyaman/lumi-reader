import { createSignal, Show } from "solid-js"
import { ITheme } from "./theme"
import Navbar from "./components/Navbar"
import { IconExit, IconToc } from "./components/icons"
import { useNavigate } from "@solidjs/router"
import ThemeList from "./components/Themelist"
import ThemeEditor from "./components/ThemeEditor"
import { ThemeProvider } from "./context/theme"
import ReaderSettings from "./components/ReaderSettings"

export default function ThemeSettings() {
    const navigate = useNavigate()

    // Sidebar/menu state
    const [selectedMenu, setSelectedMenu] = createSignal<"theme" | "reader">("theme")
    const [showSidebar, setShowSidebar] = createSignal(false)

    // Theme state
    const [editorMode, setEditorMode] = createSignal<null | {
        mode: "create" | "edit"
        theme?: ITheme
    }>(null)

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
                                            <button
                                                class="button-theme-alt cursor-pointer px-4 py-2 mt-2 mb-4 rounded-lg"
                                                onClick={() => setEditorMode({ mode: "create" })}
                                            >
                                                + New Theme
                                            </button>
                                            <ThemeList
                                                onEdit={(theme) =>
                                                    setEditorMode({ mode: "edit", theme })
                                                }
                                            />
                                        </>
                                    </Show>
                                </section>
                            </ThemeProvider>
                        </Show>
                        <Show when={selectedMenu() === "reader"}>
                            <section>
                                <h2 class="text-2xl font-semibold">Reader Settings</h2>
                                <ReaderSettings />
                            </section>
                        </Show>
                    </div>
                </main>
            </div>
        </>
    )
}
