import { createEffect, JSX, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"

type ModalProps = {
    children: JSX.Element
    show?: boolean
    onDismiss?: () => void
}

export default function Modal(props: ModalProps) {
    let modalRef: HTMLDivElement | undefined
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
            event.preventDefault()
            props.onDismiss?.()
        }
    }

    const handleClick = (event: MouseEvent) => {
        if (modalRef && !modalRef.contains(event.target as Node)) {
            props.onDismiss?.()
        }
    }

    createEffect(() => {
        if (props.show) {
            document.addEventListener("keydown", handleKeyDown)
            document.addEventListener("pointerdown", handleClick)
            onCleanup(() => {
                document.removeEventListener("keydown", handleKeyDown)
                document.removeEventListener("pointerdown", handleClick)
            })
        }
    })

    return (
        <Show when={props.show}>
            <Portal>
                {/* overlay */}
                <div class="fixed inset-0 z-50 bg-black/50" aria-hidden="true" />

                {/* content */}
                <div
                    ref={modalRef}
                    class="fixed left-1/2 top-1/2 z-50 min-w-80 max-w-md -translate-x-1/2 -translate-y-1/2 rounded border border-base02 bg-base01 px-6 py-5"
                    aria-modal="true"
                >
                    {props.children}
                </div>
            </Portal>
        </Show>
    )
}
