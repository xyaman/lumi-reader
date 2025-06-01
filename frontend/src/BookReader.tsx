import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "./lib/epub"
import { createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { BookMarkIcon } from "./icons"
import { render } from "solid-js/web"
import Navbar from "./components/Navbar"

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
            ? "px-8 h-full w-full"
            : isVertical
              ? "relative w-[95vw] overflow-hidden snap-y snap-mandatory"
              : "relative mx-8 py-12 h-screen overflow-x-hidden snap-x snap-mandatory"

    const contentClass = () =>
        !isPaginated
            ? isVertical
                ? "text-[20px] writing-mode-vertical"
                : "text-[20px] h-full"
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

    const setupPagination = () => {
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

    const showBookmarkAt = (target: HTMLElement, id: string) => {
        const iconContainer = document.createElement("span")
        iconContainer.id = id
        iconContainer.style.marginLeft = "8px"
        iconContainer.style.verticalAlign = "middle"
        iconContainer.style.display = "inline-block"

        target.appendChild(iconContainer)

        render(() => <BookMarkIcon id={id} />, iconContainer)
    }

    const removeBookmark = (id: string) => document.getElementById(id)?.remove()

    const handleScroll = () => {
        const book = currBook()
        if (!book || !containerRef.isConnected) return

        let lastIndex = 0
        let currChars = 0
        const pTags = document.querySelectorAll("p[index]")

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
        book.currChars = currChars
        book.save().catch(console.error)

        // removeBookmark("main-bookmark")
        // const target = pTags[lastIndex + 1] || pTags[lastIndex]
        // if (!isVertical && target) showBookmarkAt(target, "main-bookmark")
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
            const images = book.renderContent(contentRef, { xhtml: "all" })
            book.insertCss()
            setCurrBook(book)
            setImgUrls(images)

            const target = document.querySelector(`p[index='${book.currParagraphId}']`)
            target?.scrollIntoView()

            document.querySelectorAll("p").forEach((p) => {
                const index = p.getAttribute("index")
                if (!index) return

                const highlight = (updateDb: boolean = true) => {
                    const active = p.style.backgroundColor !== ""
                    p.style.backgroundColor = active ? "" : "black"

                    active ? removeBookmark(index) : showBookmarkAt(p, index)

                    if (updateDb) {
                        active ? book.bookmarks.delete(index) : book.bookmarks.add(index)
                        book.save()
                    }
                }

                p.addEventListener("click", () => highlight())
                if (book.bookmarks.has(index)) highlight(false)
            })

            if (isVertical) {
                containerRef.scrollLeft = 0
            }

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
        <div class="bg-white dark:bg-zinc-800 text-black dark:text-white">
            <button
                onClick={() => {
                    setShowNav(true)
                    setSidebarOpen(false)
                }}
                class="fixed top-0 left-0 right-0 h-8 z-10 bg-transparent"
            ></button>

            <Show when={showNav()}>
                <Navbar>
                    <Navbar.Left>
                        <button
                            onClick={() => {
                                setSidebarOpen(true)
                                setShowNav(false)
                            }}
                            class="flex items-center space-x-2 text-base font-semibold hover:underline"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-5 h-5"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5"
                                />
                            </svg>
                        </button>
                    </Navbar.Left>
                </Navbar>
            </Show>

            <aside
                class={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg p-5 z-40 transform transition-transform duration-300 ${
                    sidebarOpen() ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold">Table of Contents</h2>
                    <button
                        class="text-gray-500 hover:text-gray-800 dark:hover:text-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        ✕
                    </button>
                </div>
                <nav class="space-y-2">
                    <For each={currBook()?.manifest.nav}>
                        {(item) => (
                            <p
                                class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                                onClick={() => navigationGoTo(item.href)}
                            >
                                {item.text}
                            </p>
                        )}
                    </For>
                </nav>
            </aside>

            <div
                id="reader-container"
                class={containerClass()}
                ref={(el) => (containerRef = el)}
                onClick={() => {
                    setSidebarOpen(false)
                    setShowNav(false)
                }}
            >
                <div
                    id="reader-content"
                    ref={(el) => (contentRef = el)}
                    class={contentClass()}
                ></div>
            </div>
        </div>
    )
}
