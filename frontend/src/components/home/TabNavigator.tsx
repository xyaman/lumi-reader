import { A, useLocation } from "@solidjs/router"
import { IconCalendar, IconHome, IconSettings, IconUser, IconUsers } from "../icons"
import { createEffect, createSignal, For } from "solid-js"
import { useAuthState } from "@/context/auth"

/**
 * Displays a bottom tab navigator, used in mobile devices
 * Note: Needs access to a solidjs router
 */
export function TabNavigator(props: { height: string }) {
    const location = useLocation()
    const authState = useAuthState()

    const [tabs, setTabs] = createSignal([
        { href: "/", icon: IconHome },
        { href: "/sessions", icon: IconCalendar },
        { href: "/social", icon: IconUsers },
        { href: "/settings", icon: IconSettings },
    ])

    createEffect(() => {
        if (authState.status === "authenticated" || authState.status === "offline") {
            setTabs([
                { href: "/", icon: IconHome },
                { href: "/sessions", icon: IconCalendar },
                { href: "/social", icon: IconUsers },
                { href: "/me", icon: IconUser },
            ])
        }
    })

    return (
        <div
            class="fixed bottom-0 left-0 right-0 bg-base01 border-t border-base02 flex justify-around items-center p-2 md:hidden"
            style={{ height: props.height }}
        >
            <For each={tabs()}>
                {(tab) => (
                    <A href={tab.href} class="p-2" classList={{ "text-base0D": location.pathname === tab.href }}>
                        <tab.icon />
                    </A>
                )}
            </For>
        </div>
    )
}
