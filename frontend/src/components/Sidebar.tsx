import { Show } from "solid-js"
import { JSX } from "solid-js/jsx-runtime"

type SidebarProps = {
    open: boolean
    side: "left" | "right"
    title: string
    children: JSX.Element
    onClose?: () => void
    overlay?: boolean
}

function Sidebar(props: SidebarProps) {
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
                class={`fixed top-0 ${sideClass()} h-full w-72 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg p-5 z-40 transform transition-transform duration-300`}
            >
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">{props.title ?? "Sidebar"}</h2>
                    <button
                        class="text-gray-500 hover:text-gray-800 dark:hover:text-white"
                        onClick={props.onClose}
                    >
                        ✕
                    </button>
                </div>

                <div class="space-y-2 overflow-y-auto">{props.children}</div>
            </aside>
        </>
    )
}

export default Sidebar
