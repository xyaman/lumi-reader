import { createSignal, onCleanup, onMount } from "solid-js"

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = createSignal(window.innerWidth <= breakpoint)
    onMount(() => {
        const handler = () => setIsMobile(window.innerWidth <= breakpoint)
        window.addEventListener("resize", handler)
        onCleanup(() => window.removeEventListener("resize", handler))
    })
    return isMobile
}
