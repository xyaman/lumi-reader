import Resizable from "@corvu/resizable"
import LibraryProvider from "@/context/library"
import { useIsMobile } from "@/hooks"
import { useLocation } from "@solidjs/router"
import { createEffect, createSignal, JSX, Show } from "solid-js"

import { Sidebar, TabNavigator } from "@/components/home"
import { lsHome } from "@/services/localStorage"

export function Home(props: { children?: JSX.Element }) {
    const isMobile = useIsMobile()
    const location = useLocation()

    const [sizes, setSizes] = createSignal(lsHome.resizableSizes())
    createEffect(() => lsHome.setResizableSizes(sizes()))

    const onSizesChange = (newSizes: number[]) => {
        // normalize size (it gets weird when resizing the screen sometimes)
        const left = Math.min(0.3, newSizes[0])
        const right = 1 - left
        if (sizes()[0] === left) return
        setSizes([left, right])
    }

    // note: the main-container id attribute is used by UserPage.tsx
    return (
        <LibraryProvider>
            <Show
                when={isMobile()}
                fallback={
                    // Desktop version
                    <div class="size-full">
                        <Resizable class="size-full" sizes={sizes()} onSizesChange={onSizesChange}>
                            <Resizable.Panel minSize={0.1} maxSize={0.3} class="overflow-hidden">
                                <Sidebar />
                            </Resizable.Panel>
                            <Resizable.Handle class="group basis-3 px-0.75">
                                <div class="size-full rounded-sm transition-colors group-data-active:bg-base02 group-data-dragging:bg-base03" />
                            </Resizable.Handle>
                            <Resizable.Panel minSize={0.7} maxSize={0.9} class="overflow-y-auto" id="main-container">
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
