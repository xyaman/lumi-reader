import { createMemo, For } from "solid-js"
import { A, useLocation } from "@solidjs/router"
import { IconCalendar, IconHome, IconSettings } from "@/components/icons"

type Props = {
    fullSize?: boolean
    default?: string
}

export function Sidebar(props: Props) {
    const location = useLocation()
    const activePath = createMemo(() => location.pathname)

    const navItems = [
        { href: "/settings/reader", label: "Reader", icon: IconHome },
        { href: "/settings/theme", label: "Theme", icon: IconCalendar },
        { href: "/settings/sessions", label: "Sessions", icon: IconSettings },
    ]

    return (
        <div class={`bg-base01 border border-base02 ${props.fullSize ? "w-full min-h-screen" : "w-64"}`}>
            {/* User */}
            <h1 class="p-4 text-2xl font-bold">Settings</h1>

            {/* Navigation */}
            <nav class="p-2" aria-label="Main navigation">
                <ul>
                    <For each={navItems}>
                        {(item) => (
                            <li
                                classList={{
                                    "border-l-3 border-base0D":
                                        activePath() === item.href ||
                                        (activePath() === "/settings" && item.href === props.default),
                                }}
                            >
                                <A href={item.href} class="flex hover:bg-base02 p-2 rounded">
                                    <span class="mr-3">{<item.icon />}</span>
                                    <span>{item.label}</span>
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
            </nav>
        </div>
    )
}
