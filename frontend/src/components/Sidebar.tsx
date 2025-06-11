import { Show, JSX } from "solid-js"
import { ThemeProvider } from "@/context/theme"
import ThemeList from "@/components/Themelist"
import ReaderSettings from "@/components/ReaderSettings"

type SidebarProps = {
    open: boolean
    side: "left" | "right"
    title: string
    children?: JSX.Element
    onClose?: () => void
    overlay?: boolean
}

export default function Sidebar(props: SidebarProps) {
    const sideClass = () => {
        if (props.side === "left") {
            return props.open ? "left-0 translate-x-0" : "-translate-x-full"
        } else {
            return props.open ? "right-0 translate-x-0" : "translate-x-full right-0"
        }
    }

    return (
        <>
            <Show when={props.overlay && props.open}>
                <div class="fixed inset-0 bg-black opacity-30 z-30" onClick={props.onClose} />
            </Show>
            <aside
                class={`sidebar-theme fixed top-0 ${sideClass()} h-full w-72 shadow-lg p-5 z-40 transform transition-transform duration-300`}
            >
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">{props.title}</h2>
                    <Show when={props.onClose}>
                        <button class="cursor-pointer text-[var(--base05)]" onClick={props.onClose}>
                            ✕
                        </button>
                    </Show>
                </div>

                <div class="space-y-2">{props.children}</div>
            </aside>
        </>
    )
}

type SettingsSidebarProps = SidebarProps & {
    onSave: (isVertical: boolean, isPaginated: boolean, padding: boolean) => void
}

export function SettingsSidebar(props: SettingsSidebarProps) {
    return (
        <Sidebar side="right" overlay title="Settings" open={props.open} onClose={props.onClose}>
            <div class="space-y-4">
                <ReaderSettings onSave={props.onSave} />
                <ThemeProvider>
                    <ThemeList selectOnly />
                </ThemeProvider>
            </div>
        </Sidebar>
    )
}
