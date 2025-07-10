import { createMemo, createSignal, Show } from "solid-js"
import { ITheme } from "@/theme"
import Navbar from "@/components/Navbar"
import { IconToc } from "@/components/icons"
import { A, useParams } from "@solidjs/router"
import ThemeList from "@/components/Themelist"
import ThemeEditor from "@/components/ThemeEditor"
import { ThemeProvider } from "@/context/theme"
import ReaderSettings from "@/components/ReaderSettings"

type Menu = "theme" | "reader"

export default function Settings() {
    const params = useParams()
    // Sidebar/menu state
    const selectedMenu = createMemo<Menu>(() => (params.name as Menu) ?? "theme")
    const [showSidebar, setShowSidebar] = createSignal(false)

    // Theme state
    const [editorMode, setEditorMode] = createSignal<null | {
        mode: "create" | "edit"
        theme?: ITheme
    }>(null)

    return (
        <>
            <Navbar fixed disableCollapse>
                <Navbar.Left>
                    <button class="md:hidden mr-4" onClick={() => setShowSidebar((prev) => !prev)}>
                        <IconToc />
                    </button>
                    <A
                        href="/"
                        class="text-xl font-bold hover:text-[var(--base0D)] transition-colors"
                    >
                        ← lumireader
                    </A>
                </Navbar.Left>
            </Navbar>
            <div class="mt-12 flex flex-col md:flex-row min-h-screen">
                <aside
                    class={`navbar-theme w-full md:w-64 p-4 md:block ${showSidebar() ? "block" : "hidden"}`}
                >
                    <ul class="space-y-2">
                        <li>
                            <A
                                href="/settings/theme"
                                class={`cursor-pointer w-full text-left font-medium hover:opacity-70 rounded px-2 py-1 ${
                                    selectedMenu() === "theme"
                                        ? "bg-(--base02) text-(--base05)"
                                        : "text-(--base04)"
                                }`}
                                onClick={() => setShowSidebar(false)}
                            >
                                Theme Settings
                            </A>
                        </li>
                        <li>
                            <A
                                href="/settings/reader/"
                                class={`cursor-pointer w-full text-left font-medium hover:opacity-70 rounded px-2 py-1 ${
                                    selectedMenu() === "reader"
                                        ? "bg-(--base02) text-(--base05)"
                                        : "text-(--base04)"
                                }`}
                                onClick={() => setShowSidebar(false)}
                            >
                                Reader Settings
                            </A>
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
                                                class="button-alt cursor-pointer px-4 py-2 mt-2 mb-4 rounded-lg"
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
