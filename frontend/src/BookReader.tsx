import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "./lib/epub"
import { createSignal, onCleanup } from "solid-js"

export default function BookReader() {
    const params = useParams()
    const navigate = useNavigate()
    let contentRef: HTMLDivElement | undefined

    const [imgUrls, setImgUrls] = createSignal<string[]>([])
    const [paginated, setPaginated] = createSignal(true)

    if (!params.id) {
        navigate("/", { replace: true })
    }

    let currentPage = 0
    function goToPage(page: number) {
        const container = document.getElementById("reader-container")!

        currentPage = Math.max(
            0,
            Math.min(page, Math.floor(container.scrollWidth / container.clientWidth)),
        )
        container.scrollTo({ left: currentPage * container.clientWidth, behavior: "auto" })
    }

    function setupPagination() {
        let startX = 0

        document.getElementById("reader-container")!.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX
        })

        document.getElementById("reader-container")!.addEventListener("touchend", (e) => {
            const endX = e.changedTouches[0].clientX
            const delta = endX - startX

            if (Math.abs(delta) > 50) {
                if (delta < 0) {
                    goToPage(currentPage + 1)
                } else {
                    goToPage(currentPage - 1)
                }
            }
        })

        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowDown" || e.key === "PageDown") {
                goToPage(currentPage + 1)
            } else if (e.key === "ArrowUp" || e.key === "PageUp") {
                goToPage(currentPage - 1)
            }
        })

        window.addEventListener("resize", () => goToPage(currentPage))
    }

    const id = parseInt(params.id)
    EpubBook.getById(id)
        .then((record) => {
            if (!record) {
                console.log("book with id:", id, "not found")
                navigate("/", { replace: true })
                return
            }

            const book = EpubBook.fromRecord(record)
            if (book && contentRef) {
                book.renderContent(contentRef).then((urls) => setImgUrls(urls))
                book.insertCss()

                setTimeout(setupPagination, 1000)
            }
        })
        .catch((e) => {
            console.log("Error when fetching book:", e)
            navigate("/", { replace: true })
        })

    onCleanup(() => {
        for (const url of imgUrls()) {
            URL.revokeObjectURL(url)
        }

        document.head.querySelectorAll("#temp-css").forEach((style) => style.remove())
    })

    const containerClass = () =>
        paginated()
            ? "relative mx-12 pt-12 pb-12 h-screen overflow-hidden snap-x snap-mandatory"
            : "relative h-screen overflow-auto"

    const contentClass = () =>
        paginated()
            ? "h-full [column-width:100vw] text-[20px] leading-[1.85]"
            : "text-[20px] leading-[1.85]"

    return (
        <div class="bg-gray-300 min-h-screen">
            <div id="reader-container" class={containerClass()}>
                <div
                    id="reader-content"
                    ref={(el) => (contentRef = el)}
                    class={contentClass()}
                ></div>
            </div>
            <button
                class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => {
                    setPaginated((p) => !p)
                }}
            >
                {paginated() ? "Switch to Scrolling" : "Switch to Paginated"}
            </button>
        </div>
    )
}
