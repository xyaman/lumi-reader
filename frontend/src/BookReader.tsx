import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "./lib/epub"
import { createSignal, onCleanup } from "solid-js"

export default function BookReader() {
    const params = useParams()
    const navigate = useNavigate()
    let contentRef: HTMLDivElement
    let containerRef: HTMLDivElement

    const isPaginated = localStorage.getItem("reader:paginated") !== "false"
    const isVertical = localStorage.getItem("reader:vertical") === "true"

    const [imgUrls, setImgUrls] = createSignal<string[]>([])

    const id = Number(params.id)
    if (!id) navigate("/", { replace: true })

    function flipPage(multiplier: 1 | -1) {
        const container = containerRef

        const offset = isVertical ? container.clientHeight : container.clientWidth
        const current = isVertical ? container.scrollTop : container.scrollLeft
        const max = isVertical ? container.scrollHeight : container.scrollWidth

        let next = Math.ceil(current + offset * multiplier)
        next = Math.max(0, Math.min(next, max))

        isVertical
            ? container.scrollTo({ top: next, behavior: "instant" })
            : container.scrollTo({ left: next, behavior: "instant" })
    }

    function setupPagination(container: HTMLElement) {
        let startX = 0

        const onTouchStart = (e: TouchEvent) => {
            startX = e.touches[0].clientX
        }

        const onTouchEnd = (e: TouchEvent) => {
            const delta = e.changedTouches[0].clientX - startX
            if (Math.abs(delta) > 50) flipPage(delta < 0 ? 1 : -1)
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown" || e.key === "PageDown") flipPage(1)
            else if (e.key === "ArrowUp" || e.key === "PageUp") flipPage(-1)
        }

        container.addEventListener("touchstart", onTouchStart)
        container.addEventListener("touchend", onTouchEnd)
        document.addEventListener("keydown", onKeyDown)
        window.addEventListener("resize", () => flipPage(-1))
    }

    EpubBook.getById(id)
        .then((record) => {
            if (!record) return navigate("/", { replace: true })

            const book = EpubBook.fromRecord(record)
            if (book && contentRef) {
                book.renderContent(contentRef).then(setImgUrls)
                book.insertCss()
                setupPagination(containerRef)
            }
        })
        .catch((e) => {
            console.error("Error when fetching book:", e)
            navigate("/", { replace: true })
        })

    onCleanup(() => {
        imgUrls().forEach((url) => URL.revokeObjectURL(url))
        document.head.querySelectorAll("#temp-css").forEach((el) => el.remove())
    })

    const containerClass = () => {
        if (!isPaginated) return "px-8 h-screen"
        return isVertical
            ? "relative w-[95vw] overflow-hidden snap-y snap-mandatory"
            : "relative mx-8 py-12 h-screen overflow-x-hidden snap-x snap-mandatory"
    }

    const contentClass = () => {
        if (!isPaginated) return isVertical ? "text-[20px] writing-mode-vertical" : "text-[20px]"
        return isVertical
            ? "h-full w-full [column-width:100vw] [column-fill:auto] [column-gap:0px] text-[20px] writing-mode-vertical"
            : "h-full [column-width:100vw] [column-fill:auto] [column-gap:0px]"
    }

    return (
        <div>
            <div id="reader-container" class={containerClass()} ref={(el) => (containerRef = el)}>
                <div id="reader-content" ref={(el) => (contentRef = el)} class={contentClass()} />
            </div>
        </div>
    )
}
