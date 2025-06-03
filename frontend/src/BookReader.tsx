import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "./lib/epub"
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { BookMarkIcon } from "./icons"
import { render } from "solid-js/web"
import Navbar from "./components/Navbar"
import Sidebar from "./components/Sidebar"

function updateReaderStyle(fontSize: number, lineHeight: number | string) {
    const fixedFontSize = Math.max(1, fontSize)

    document.documentElement.style.setProperty("--reader-font-size", `${fixedFontSize}px`)
    document.documentElement.style.setProperty("--reader-line-height", `${lineHeight}`)
    localStorage.setItem("reader:fontSize", String(fontSize))
    localStorage.setItem("reader:lineHeight", String(lineHeight))
}

export default function BookReader() {
    const params = useParams()
    const navigate = useNavigate()
    const id = Number(params.id)

    if (!id) navigate("/", { replace: true })

    // Signals
    const [isReady, setIsReady] = createSignal(false)
    const [currBook, setCurrBook] = createSignal<EpubBook | null>(null)
    const [imgUrls, setImgUrls] = createSignal<string[]>([])
    const [draftVertical, setDraftVertical] = createSignal(
        localStorage.getItem("reader:vertical") === "true",
    )
    const [draftPaginated, setDraftPaginated] = createSignal(
        localStorage.getItem("reader:paginated") === "true",
    )

    // UI State
    const [navOpen, setNavOpen] = createSignal(false)
    const [tocOpen, setTocOpen] = createSignal(false)
    const [settingsOpen, setSettingsOpen] = createSignal(false)

    // Reader Style
    const [draftStyle, setDraftStyle] = createSignal({
        fontSize: Number(localStorage.getItem("reader:fontSize") ?? 20),
        lineHeight: localStorage.getItem("reader:lineHeight") ?? "1.5",
    })

    // Refs
    let mainRef!: HTMLDivElement
    let containerRef!: HTMLDivElement
    let contentRef!: HTMLDivElement
    let charCounterRef!: HTMLSpanElement

    const isPaginated = localStorage.getItem("reader:paginated") === "true"
    const isVertical = localStorage.getItem("reader:vertical") === "true"

    const containerClass = () =>
        !isPaginated
            ? "px-8"
            : isVertical
              ? "relative w-[95vw] overflow-hidden snap-y snap-mandatory"
              : "relative mx-8 py-12 h-screen overflow-x-hidden snap-x snap-mandatory"

    const contentClass = () =>
        !isPaginated
            ? isVertical
                ? "writing-mode-vertical max-h-[98vh]"
                : "h-full"
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
        const anchorId = href.includes("#") ? href.split("#").pop() : null
        if (anchorId) document.getElementById(anchorId)?.scrollIntoView()
        setNavOpen(false)
        setTocOpen(false)
    }

    const setupPagination = () => {
        let startX = 0

        const onTouchStart = (e: TouchEvent) => (startX = e.touches[0].clientX)

        const onTouchEnd = (e: TouchEvent) => {
            const delta = e.changedTouches[0].clientX - startX
            if (Math.abs(delta) > 50) flipPage(delta < 0 ? 1 : -1)
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (isVertical) {
                if (e.key === "ArrowLeft") flipPage(1)
                else if (e.key === "ArrowRight") flipPage(-1)
            } else {
                if (e.key === "ArrowRight") flipPage(1)
                else if (e.key === "ArrowLeft") flipPage(-1)
            }
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
                (!isPaginated && isVertical && rect.x < 0) ||
                (isPaginated && !isVertical && rect.x > 0) ||
                (isPaginated && isVertical && rect.y > 0)

            if (visible) break
            lastIndex = Number(pTags[i].getAttribute("index")) ?? lastIndex
            currChars = Number(pTags[i].getAttribute("characumm")) ?? currChars
        }

        book.currParagraphId = lastIndex
        book.currChars = currChars
        book.save().catch(console.error)
        charCounterRef.innerHTML = `${book.currChars}/${book.totalChars}`

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
            setCurrBook(book)
            setIsReady(true) // triggers DOM to render contentRef

            // defer until DOM is fully ready
            queueMicrotask(() => {
                const images = book.renderContent(contentRef, { xhtml: "all" })
                book.insertCss()
                setImgUrls(images)

                charCounterRef.innerHTML = `${book.currChars}/${book.totalChars}`

                const target = document.querySelector(`p[index='${book.currParagraphId}']`)
                target?.scrollIntoView()

                document.querySelectorAll("p").forEach((p) => {
                    const index = p.getAttribute("index")
                    if (!index) return

                    const highlight = (updateDb = true) => {
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

                if (isVertical && !isPaginated && book.currParagraphId === 0) {
                    containerRef.scrollLeft = 0
                }

                setupPagination()
            })
        } catch (e) {
            console.error("Failed to load book", e)
            navigate("/", { replace: true })
        }
    }

    onMount(() => {
        const onWheel = (e: WheelEvent) => {
            // e.preventDefault()
            mainRef.scrollLeft += e.deltaY
            handleScroll()
        }

        initializeBook().then(() => {
            if (!isPaginated && isVertical) {
                // Prevent default vertical scroll
                mainRef.addEventListener("wheel", onWheel, { passive: false })
            }
        })

        if (!isPaginated && !isVertical) {
            const debouncedScroll = initScrollTracking()
            onCleanup(() => {
                document.removeEventListener("scroll", debouncedScroll)
                mainRef.removeEventListener("wheel", onWheel)
            })
        }

        onCleanup(() => {
            imgUrls().forEach((url) => URL.revokeObjectURL(url))
            document.head.querySelectorAll("#temp-css").forEach((el) => el.remove())
        })
    })

    // Effect: Update style (and save in local storage) every time it changes
    createEffect(() => {
        if (settingsOpen()) return
        const { fontSize, lineHeight } = draftStyle()
        updateReaderStyle(fontSize, lineHeight)
    })

    return (
        <div
            ref={mainRef}
            class={`bg-white dark:bg-zinc-800 text-black dark:text-white ${isVertical && "h-screen overflow-y-hidden"}`}
        >
            <button
                onClick={() => {
                    setNavOpen(true)
                    setTocOpen(false)
                }}
                class="fixed top-0 left-0 right-0 h-8 z-10 bg-transparent"
            ></button>
            <Show when={navOpen()}>
                <Navbar>
                    <Navbar.Left>
                        <button
                            onClick={() => {
                                setTocOpen(true)
                                setNavOpen(false)
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
                    <Navbar.Right>
                        <button
                            onClick={() => {
                                setTocOpen(false)
                                setSettingsOpen(true)
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="size-6"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                />
                            </svg>
                        </button>
                        <button onClick={() => navigate("/")}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="size-6"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
                                />
                            </svg>
                        </button>
                    </Navbar.Right>
                </Navbar>
            </Show>

            <Sidebar
                open={tocOpen()}
                side="left"
                title="Table of Contents"
                overlay={true}
                onClose={() => setTocOpen(false)}
            >
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
            </Sidebar>
            <Sidebar
                side="right"
                overlay={true}
                title="Settings"
                open={settingsOpen()}
                onClose={() => setSettingsOpen(false)}
            >
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Font Size (px)
                        </label>
                        <input
                            value={draftStyle().fontSize}
                            onInput={(e) =>
                                setDraftStyle((prev) => ({
                                    ...prev,
                                    fontSize: Number(e.currentTarget.value),
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Line Height (unitless)
                        </label>
                        <input
                            value={draftStyle().lineHeight}
                            onInput={(e) =>
                                setDraftStyle((prev) => ({
                                    ...prev,
                                    lineHeight: e.currentTarget.value,
                                }))
                            }
                        />
                    </div>

                    <hr />
                    <div class="space-y-4">
                        <p class="font-bold text-sm">
                            *These options will reload the reader. Unsaved progress will be lost.
                        </p>
                        <div class="flex items-center space-x-2">
                            <input
                                id="vertical-checkbox"
                                type="checkbox"
                                checked={draftVertical()}
                                onInput={(e) => setDraftVertical(e.currentTarget.checked)}
                                class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                            />
                            <label
                                for="vertical-checkbox"
                                class="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Vertical Reading
                            </label>
                        </div>
                        <div class="flex items-center space-x-2">
                            <input
                                id="paginated-checkbox"
                                type="checkbox"
                                checked={draftPaginated()}
                                onInput={(e) => setDraftPaginated(e.currentTarget.checked)}
                                class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                            />
                            <label
                                for="paginated-checkbox"
                                class="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Simulate Pages
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const changed =
                                isVertical !== draftVertical() || isPaginated !== draftPaginated()
                            localStorage.setItem("reader:vertical", String(draftVertical()))
                            localStorage.setItem("reader:paginated", String(draftPaginated()))
                            if (changed) location.reload()

                            setSettingsOpen(false)
                        }}
                        class="px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600"
                    >
                        Save
                    </button>
                </div>
            </Sidebar>
            <Show
                when={isReady()}
                fallback={<div class="h-screen w-screen p-8 text-center">Loading book…</div>}
            >
                <div
                    id="reader-container"
                    class={containerClass()}
                    ref={containerRef}
                    onClick={() => {
                        setTocOpen(false)
                        setNavOpen(false)
                    }}
                >
                    <div
                        id="reader-content"
                        ref={contentRef}
                        class={contentClass()}
                        style="font-size: var(--reader-font-size); line-height: var(--reader-line-height);"
                    ></div>
                </div>
                <span
                    id="character-counter"
                    ref={charCounterRef}
                    class="z-10 right-[0.5rem] bottom-[0.5rem] fixed text-[0.75rem]"
                ></span>
            </Show>
        </div>
    )
}
