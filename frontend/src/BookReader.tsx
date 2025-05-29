import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "./lib/epub"
import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { BookMarkIcon } from "./icons"
import { render } from "solid-js/web"

export default function BookReader() {
    const params = useParams()
    const navigate = useNavigate()
    const id = Number(params.id)

    if (!id) navigate("/", { replace: true })

    // Signals
    const [currBook, setCurrBook] = createSignal<EpubBook | null>(null)
    const [imgUrls, setImgUrls] = createSignal<string[]>([])
    const [sidebarOpen, setSidebarOpen] = createSignal(false)
    const [showNav, setShowNav] = createSignal(false)

    // Refs
    let containerRef: HTMLDivElement
    let contentRef: HTMLDivElement

    const isPaginated = localStorage.getItem("reader:paginated") === "true"
    const isVertical = localStorage.getItem("reader:vertical") === "true"

    const containerClass = () =>
        !isPaginated
            ? "px-8 h-screen"
            : isVertical
              ? "relative w-[95vw] overflow-hidden snap-y snap-mandatory"
              : "relative mx-8 py-12 h-screen overflow-x-hidden snap-x snap-mandatory"

    const contentClass = () =>
        !isPaginated
            ? isVertical
                ? "text-[20px] writing-mode-vertical"
                : "text-[20px]"
            : isVertical
              ? "h-full w-full [column-width:100vw] [column-fill:auto] [column-gap:0px] text-[20px] writing-mode-vertical"
              : "h-full [column-width:100vw] [column-fill:auto] [column-gap:0px]"

    const flipPage = (multiplier: 1 | -1) => {
        const offset = isVertical ? containerRef.clientHeight : containerRef.clientWidth
        const current = isVertical ? containerRef.scrollTop : containerRef.scrollLeft
        const max = isVertical ? containerRef.scrollHeight : containerRef.scrollWidth
        const next = Math.max(0, Math.min(Math.ceil(current + offset * multiplier), max))
        const scrollToOpts = isVertical ? { top: next } : { left: next }
        containerRef.scrollTo({ ...scrollToOpts, behavior: "instant" })
        handleScroll()
    }

    // TODO: make the difference between paginated and continous
    // Paginated mode should not load all xhtml at once
    const navigationGoTo = (href?: string) => {
        if (!href) return
        const anchorId = href.split("#").pop()
        document.getElementById(anchorId!)?.scrollIntoView()
        setShowNav(false)
        setSidebarOpen(false)
    }

    function setupPagination() {
        let startX = 0

        const onTouchStart = (e: TouchEvent) => (startX = e.touches[0].clientX)

        const onTouchEnd = (e: TouchEvent) => {
            const delta = e.changedTouches[0].clientX - startX
            if (Math.abs(delta) > 50) flipPage(delta < 0 ? 1 : -1)
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown" || e.key === "PageDown") flipPage(1)
            else if (e.key === "ArrowUp" || e.key === "PageUp") flipPage(-1)
        }

        containerRef.addEventListener("touchstart", onTouchStart)
        containerRef.addEventListener("touchend", onTouchEnd)
        document.addEventListener("keydown", onKeyDown)
        window.addEventListener("resize", () => flipPage(-1))
    }

    function showBookmarkAt(target: HTMLElement, id: string) {
        const iconContainer = document.createElement("span")
        iconContainer.id = id
        iconContainer.style.marginLeft = "8px"
        iconContainer.style.verticalAlign = "middle"
        iconContainer.style.display = "inline-block"

        target.appendChild(iconContainer)

        render(() => <BookMarkIcon id={id} />, iconContainer)

        // TODO: this is saving the same bookmarks at rendering again
        // CHANGE THE LOGIC!
        if (id != "main-bookmark") {
            currBook()?.bookmarks.add(id)
            currBook()?.save()
        }
    }

    function removeBookmark(id: string) {
        document.getElementById(id)?.remove()
    }

    const handleScroll = () => {
        const book = currBook()
        if (!book || !containerRef.isConnected) return

        let lastIndex = 0
        let currChars = 0
        const pTags = document.querySelectorAll("p")

        for (let i = 0; i < pTags.length; i++) {
            const rect = pTags[i].getBoundingClientRect()
            const visible =
                (!isPaginated && !isVertical && rect.bottom > 0) ||
                (!isPaginated && isVertical && rect.top > 0) ||
                (isPaginated && !isVertical && rect.x > 0) ||
                (isPaginated && isVertical && rect.y > 0)

            if (visible) break
            lastIndex = Number(pTags[i].getAttribute("index")) ?? lastIndex
            currChars = Number(pTags[i].getAttribute("characumm")) ?? currChars
        }

        book.currParagraphId = lastIndex
        book.save().catch(console.error)

        removeBookmark("main-bookmark")
        const target = pTags[lastIndex + 1] || pTags[lastIndex]
        if (!isVertical && target) showBookmarkAt(target, "main-bookmark")
    }

    const initScrollTracking = () => {
        let scrollTimer: number | null = null

        const debouncedScroll = () => {
            if (scrollTimer !== null) clearTimeout(scrollTimer)
            scrollTimer = setTimeout(handleScroll, 300)
        }

        document.addEventListener("scroll", debouncedScroll)
        return debouncedScroll
    }

    const initializeBook = async () => {
        try {
            const record = await EpubBook.getById(id)
            if (!record) return navigate("/", { replace: true })

            const book = EpubBook.fromRecord(record)
            const images = await book.renderContent(contentRef, { xhtml: "all" })
            book.insertCss()
            setCurrBook(book)
            setImgUrls(images)

            const target = book.currParagraphId
                ? document.querySelector(`p[index='${book.currParagraphId}']`)
                : null
            target?.scrollIntoView()

            document.querySelectorAll("p").forEach((p) => {
                const index = p.getAttribute("index")
                if (!index) return

                const highlight = () => {
                    const active = p.style.backgroundColor !== ""
                    p.style.backgroundColor = active ? "" : "#e0e0e0"
                    active ? removeBookmark(index) : showBookmarkAt(p, index)
                }

                p.addEventListener("click", highlight)
                if (book.bookmarks.has(index)) highlight()
            })

            setupPagination()
        } catch (e) {
            console.error("Failed to load book", e)
            navigate("/", { replace: true })
        }
    }

    onMount(() => {
        initializeBook()
        if (!isPaginated) {
            const debouncedScroll = initScrollTracking()
            onCleanup(() => document.removeEventListener("scroll", debouncedScroll))
        }

        onCleanup(() => {
            imgUrls().forEach((url) => URL.revokeObjectURL(url))
            document.head.querySelectorAll("#temp-css").forEach((el) => el.remove())
        })
    })

    return (
        <div>
            <button
                onClick={() => setShowNav(true)}
                class="fixed top-0 left-0 right-0 h-8 z-10 bg-transparent"
            ></button>

            <Show when={showNav()}>
                <nav class="fixed top-0 left-0 w-full h-12 bg-gray-700 text-white p-2 z-20">
                    <div class="flex justify-between items-center mb-6">
                        <button onClick={() => setSidebarOpen(true)} class="text-xl font-semibold">
                            Navigation
                        </button>
                    </div>
                </nav>
            </Show>

            <Show when={sidebarOpen()}>
                <div class="fixed top-0 left-0 h-full w-64 bg-gray-700 text-white p-4 z-20">
                    <h2 class="text-xl font-bold">Navigation</h2>
                    <For each={currBook()?.manifest.nav}>
                        {(item) => (
                            <p
                                class="cursor-pointer py-2"
                                onClick={() => navigationGoTo(item.href)}
                            >
                                {item.text}
                            </p>
                        )}
                    </For>
                </div>
            </Show>

            <div
                id="reader-container"
                class={containerClass()}
                ref={(el) => (containerRef = el)}
                onClick={() => {
                    setSidebarOpen(false)
                    setShowNav(false)
                }}
            >
                <div id="reader-content" ref={(el) => (contentRef = el)} class={contentClass()} />
            </div>
        </div>
    )
}
