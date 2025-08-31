import { createMemo, Switch, Match, Show } from "solid-js"
import Navbar from "@/components/Navbar"
import { A, useParams } from "@solidjs/router"
import { Sidebar } from "@/components/settings/Sidebar"

// pages
import { ReaderSettings } from "./readerSettings"
import { SessionSettings } from "./sessionSettings"
import { ThemeSettings } from "./themeSettings"
import { AccountSettings } from "./accountSettings"
import { useIsMobile } from "@/hooks"

type Menu = "theme" | "reader" | "sessions" | "account"

export function Settings() {
    const params = useParams()
    const isMobile = useIsMobile()

    // Sidebar/menu state
    const selectedMenu = createMemo<Menu>(() => (params.name as Menu) ?? null)

    // On mobile, show sidebar if no menu selected, otherwise show settings
    const showSidebarMobile = () => isMobile() && selectedMenu() === null
    const showSettingsMobile = () => isMobile() && selectedMenu()

    return (
        <>
            <Navbar fixed disableCollapse>
                <Navbar.Left>
                    <A
                        href={selectedMenu() !== null && isMobile() ? "/settings" : "/"}
                        class="text-xl font-bold hover:text-base0D transition-colors"
                    >
                        ← {selectedMenu() !== null && isMobile() ? "Settings" : "Home"}
                    </A>
                </Navbar.Left>
            </Navbar>

            <div class="mt-12 flex flex-col md:flex-row min-h-screen">
                {/* Desktop: show sidebar always */}
                <Show when={!isMobile()}>
                    <Sidebar default="/settings/reader" />
                </Show>

                {/* Mobile: show sidebar fullscreen if url location is empty */}
                <Show when={showSidebarMobile()}>
                    <Sidebar fullSize={true} />
                </Show>

                {/* Main content */}
                <Show when={!isMobile() || showSettingsMobile()}>
                    <main class="flex-1 p-6 md:p-12">
                        <div class="max-w-4xl mx-auto space-y-12">
                            <Switch>
                                <Match when={selectedMenu() === "reader" || selectedMenu() === null}>
                                    <section>
                                        <h2 class="text-2xl font-semibold">Reader Settings</h2>
                                        <ReaderSettings />
                                    </section>
                                </Match>
                                <Match when={selectedMenu() === "theme"}>
                                    <ThemeSettings />
                                </Match>
                                <Match when={selectedMenu() === "sessions"}>
                                    <SessionSettings />
                                </Match>
                                <Match when={selectedMenu() === "account"}>
                                    <AccountSettings />
                                </Match>
                            </Switch>
                        </div>
                    </main>
                </Show>
            </div>
        </>
    )
}
