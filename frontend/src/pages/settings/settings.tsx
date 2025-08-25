import { createMemo, createSignal, Show } from "solid-js"
import { ITheme } from "@/theme"
import Navbar from "@/components/Navbar"
import { A, useParams } from "@solidjs/router"
import ThemeList from "@/components/settings/Themelist"
import ThemeEditor from "@/components/settings/ThemeEditor"
import { ThemeProvider } from "@/context/theme"
import { lsReadingSessions } from "../../services/localStorage"
import { Sidebar } from "@/components/settings/Sidebar"
import { ReaderSettings } from "./readerSettings"
import { Button } from "@/ui"

type Menu = "theme" | "reader" | "sessions"

function SessionSettings() {
    const automaticStart = () => lsReadingSessions.autoStart()
    const synchronize = () => lsReadingSessions.autoSync()

    return (
        <section>
            <h2 class="text-2xl font-semibold">Session Settings</h2>
            <div class="mt-5 space-y-3">
                <div class="flex items-center space-x-2">
                    <input
                        id="automatic-checkbox"
                        type="checkbox"
                        checked={automaticStart()}
                        onChange={(e) => lsReadingSessions.setAutoStart(e.target.checked)}
                    />
                    <label for="automatic-checkbox" class="text-sm font-medium">
                        Start reading session automatically
                    </label>
                </div>
                <div class="flex items-center space-x-2">
                    <input
                        id="sync-checkbox"
                        type="checkbox"
                        checked={synchronize()}
                        onChange={(e) => lsReadingSessions.setAutoSync(e.target.checked)}
                    />
                    <label for="sync-checkbox" class="text-sm font-medium">
                        Synchronize with server automatically
                    </label>
                </div>
            </div>
        </section>
    )
}

export function Settings() {
    const params = useParams()
    // Sidebar/menu state
    const selectedMenu = createMemo<Menu>(() => (params.name as Menu) ?? "reader")

    // Theme state
    const [editorMode, setEditorMode] = createSignal<null | {
        mode: "create" | "edit"
        theme?: ITheme
    }>(null)

    return (
        <>
            <Navbar fixed disableCollapse>
                <Navbar.Left>
                    <A href="/" class="text-xl font-bold hover:text-[var(--base0D)] transition-colors">
                        ← lumireader
                    </A>
                </Navbar.Left>
            </Navbar>

            {/* Sidebar */}
            <div class="mt-12 flex flex-col md:flex-row min-h-screen">
                <Sidebar />

                {/* Main content */}
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
                                            <Button
                                                classList={{ "mb-2": true }}
                                                onClick={() => setEditorMode({ mode: "create" })}
                                            >
                                                + New Theme
                                            </Button>
                                            <ThemeList onEdit={(theme) => setEditorMode({ mode: "edit", theme })} />
                                        </>
                                    </Show>
                                </section>
                            </ThemeProvider>
                        </Show>
                        <Show when={selectedMenu() === "reader"}>
                            <section>
                                <h2 class="text-2xl font-semibold">Reader Settings</h2>
                                <ReaderSettings />
                                {/* <ReaderSettings /> */}
                            </section>
                        </Show>
                        <Show when={selectedMenu() === "sessions"}>
                            <SessionSettings />
                        </Show>
                    </div>
                </main>
            </div>
        </>
    )
}
