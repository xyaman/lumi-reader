import { A, useLocation } from "@solidjs/router"
import { IconCalendar, IconHome, IconSettings, IconUsers } from "../icons"

/// Bottom tab navigator, used in mobile devices
export function TabNavigator(props: { height: string }) {
    const location = useLocation()
    const tabs = [
        { href: "/", icon: IconHome },
        { href: "/sessions", icon: IconCalendar },
        { href: "/social", icon: IconUsers },
        { href: "/settings", icon: IconSettings },
    ]

    return (
        <div
            class="fixed bottom-0 left-0 right-0 bg-base01 border-t border-base02 flex justify-around items-center p-2 md:hidden"
            style={{ height: props.height }}
        >
            {tabs.map((tab) => (
                <A href={tab.href} class="p-2" classList={{ "text-base0D": location.pathname === tab.href }}>
                    <tab.icon />
                </A>
            ))}
        </div>
    )
}
