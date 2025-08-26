import Resizable from "@corvu/resizable"
import LibraryProvider from "@/context/library"
import { useIsMobile } from "@/hooks"
import { useLocation } from "@solidjs/router"
import { JSX, Show } from "solid-js"

import { Sidebar, TabNavigator } from "@/components/home"

export function Home(props: { children?: JSX.Element }) {
    const isMobile = useIsMobile()
    const location = useLocation()

    // note: the main-container id attribute is used by UserPage.tsx
    return (
        <LibraryProvider>
            <Show
                when={isMobile()}
                fallback={
                    // Desktop version
                    <div class="size-full">
                        <Resizable class="size-full">
                            <Resizable.Panel initialSize={0.2} minSize={0.1} class="overflow-hidden">
                                <Sidebar />
                            </Resizable.Panel>
                            <Resizable.Handle class="group basis-3 px-0.75">
                                <div class="size-full rounded-sm transition-colors group-data-active:bg-base02 group-data-dragging:bg-base03" />
                            </Resizable.Handle>
                            <Resizable.Panel
                                initialSize={0.8}
                                minSize={0.7}
                                class="overflow-y-auto"
                                id="main-container"
                            >
                                <div class="p-10">{props.children}</div>
                            </Resizable.Panel>
                        </Resizable>
                    </div>
                }
            >
                {/* Mobile version */}

                {/* Main view */}
                <div id="main-container" class="p-10 overflow-auto" style={{ height: "calc(100vh - 60px)" }}>
                    <Show when={location.pathname === "/social"}>
                        <header class="mb-8">
                            <h1 class="text-3xl font-bold">Social Activity</h1>
                        </header>
                    </Show>
                    {props.children}
                </div>

                {/* Bottom navigator */}
                <TabNavigator height="56px" />
            </Show>
        </LibraryProvider>
    )
}
