import { createEffect, createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "@/lib/epub"
import Navbar from "@/components/Navbar"
import Sidebar from "@/components/Sidebar"
import {
    IconBookmark,
    IconBookmarkFull,
    IconExit,
    IconFullscreen,
    IconSettings,
    IconToc,
    IconWindowed,
} from "@/components/icons"
import ThemeList from "@/components/Themelist"
import { ThemeProvider } from "@/context/theme"
import ReaderSettings from "@/components/ReaderSettings"

export default function BookReader() {
    const params = useParams()
    const navigate = useNavigate()
    const id = Number(params.id)
    if (!id) navigate("/", { replace: true })

    const [imgUrls, setImgUrls] = createSignal<string[]>([])
    const [currBook] = createResource(async () => {
        const record = await EpubBook.getById(id)
        if (!record) {
            navigate("/", { replace: true })
            return null
        }
        return EpubBook.fromRecord(record)
    })

    const [navOpen, setNavOpen] = createSignal(false)
    const [sideLeft, setSideLeft] = createSignal<"toc" | "bookmarks" | null>(null)
    const [settingsOpen, setSettingsOpen] = createSignal(false)

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
              ? "relative mx-auto w-[var(--reader-horizontal-padding)] h-[var(--reader-vertical-padding)] overflow-hidden snap-y snap-mandatory"
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
        updateChars()
    }

    const navigationGoTo = (href?: string) => {
        if (!href) return
        const anchorId = href.includes("#") ? href.split("#").pop() : null
        if (anchorId) document.getElementById(anchorId)?.scrollIntoView()
        setNavOpen(false)
        setSideLeft(null)
    }

    const setupPagination = () => {
        let startX = 0
        containerRef.addEventListener(
            "touchstart",
            (e: TouchEvent) => (startX = e.touches[0].clientX),
        )
        containerRef.addEventListener("touchend", (e: TouchEvent) => {
            const delta = e.changedTouches[0].clientX - startX
            if (Math.abs(delta) > 50) flipPage(delta < 0 ? 1 : -1)
        })
        document.addEventListener("keydown", (e: KeyboardEvent) => {
            if (isVertical) {
                if (e.key === "ArrowLeft") flipPage(1)
                else if (e.key === "ArrowRight") flipPage(-1)
            } else {
                if (e.key === "ArrowRight") flipPage(1)
                else if (e.key === "ArrowLeft") flipPage(-1)
            }

            if (e.key === "ArrowDown") flipPage(1)
            else if (e.key === "ArrowUp") flipPage(-1)
        })

        // TODO: temporary solution, find the real one!
        let bounce = Date.now()
        window.addEventListener("resize", () => {
            if (Date.now() - bounce < 2000) return

            setTimeout(() => {
                containerRef.classList.remove("h-screen")
                containerRef.classList.add("h-screen")
                document
                    .querySelector(`p[index='${currBook()?.currParagraphId}']`)
                    ?.scrollIntoView()
            }, 0)
        })
    }

    const updateChars = () => {
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
        charCounterRef.innerHTML = `${book.currChars}/${book.totalChars} (${Math.floor((100 * book.currChars) / book.totalChars)}%)`
    }

    const handleSettingsSave = (
        newVertical: boolean,
        newPaginated: boolean,
        paddingChanged: boolean,
    ) => {
        const changed = isVertical !== newVertical || isPaginated !== newPaginated || paddingChanged
        if (changed) location.reload()
        setSettingsOpen(false)
    }

    const initScrollTracking = () => {
        let scrollTimer: number | null = null
        const debouncedScroll = () => {
            if (scrollTimer !== null) clearTimeout(scrollTimer)
            scrollTimer = setTimeout(updateChars, 300)
        }
        document.addEventListener("scroll", debouncedScroll)
        return debouncedScroll
    }

    const initializeBook = async (book: EpubBook) => {
        try {
            const images = book.renderContent(contentRef, { xhtml: "all" })
            book.insertCss()
            setImgUrls(images)
            charCounterRef.innerHTML = `${book.currChars}/${book.totalChars} (${Math.floor((100 * book.currChars) / book.totalChars)}%)`
            document.querySelector(`p[index='${book.currParagraphId}']`)?.scrollIntoView()
            let bookmarksIds = book.bookmarks.map((b) => b.paragraphId.toString())
            document.querySelectorAll("p").forEach((p) => {
                const index = p.getAttribute("index")
                if (!index) return
                const bgColor = "bg-[var(--base01)]"
                const highlight = () => {
                    if (p.children.length) {
                        const hasIcon = Array.from(p.children).filter(
                            (p) => p.id === "bookmark-icon",
                        )
                        if (hasIcon.length === 1) {
                            document.getElementById("bookmark-icon")?.remove()
                            return
                        }
                    }

                    document.getElementById("bookmark-icon")?.remove()

                    const boomarkClick = () => {
                        const removed = book.toggleBookmark(index, p.innerHTML)
                        removed ? p.classList.remove(bgColor) : p.classList.add(bgColor)
                        book.save()
                    }

                    const bookmarkIcon = document.createElement("span")
                    bookmarkIcon.appendChild(IconBookmarkFull() as HTMLElement)

                    if (isVertical) {
                        bookmarkIcon.className =
                            "absolute right-0 bottom-0 w-[40px] h-[40px] cursor-pointer rounded-lg p-1 bg-[var(--base01)]"
                    } else {
                        bookmarkIcon.className =
                            "absolute right-0 top-0 w-[40px] h-[40px] cursor-pointer rounded-lg p-1 bg-[var(--base01)]"
                    }
                    bookmarkIcon.id = "bookmark-icon"
                    bookmarkIcon.onclick = boomarkClick

                    p.appendChild(bookmarkIcon)
                }
                p.addEventListener("click", highlight)
                p.classList.add("relative")

                if (bookmarksIds.includes(index)) p.classList.add(bgColor)
            })
            if (isVertical && !isPaginated && book.currParagraphId === 0) {
                containerRef.scrollLeft = 0
            }
            setupPagination()
        } catch (e) {
            console.error("Failed to load book", e)
            navigate("/", { replace: true })
        }
    }

    const onWheel = (e: WheelEvent) => {
        mainRef.scrollLeft += e.deltaY
        updateChars()
    }

    onMount(() => {
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

    createEffect(() => {
        const book = currBook()
        if (!book) return
        initializeBook(book).then(() => {
            if (!isPaginated && isVertical) {
                mainRef.addEventListener("wheel", onWheel, { passive: false })
            }
        })
    })

    createEffect(() => {
        document.body.style.overflow = sideLeft() !== null || settingsOpen() ? "hidden" : ""
    })

    const isFullscreen = () => {
        return document.fullscreenElement != null
    }

    return (
        <div
            ref={mainRef}
            class={`${
                isPaginated && isVertical
                    ? "h-screen flex items-center"
                    : isVertical
                      ? "h-screen overflow-y-hidden"
                      : ""
            }`}
        >
            <button
                onClick={() => {
                    setNavOpen(true)
                    setSideLeft(null)
                }}
                class="fixed top-0 left-0 right-0 h-12 z-10 bg-transparent cursor-pointer"
            />
            <Show when={navOpen()}>
                <Navbar>
                    <Navbar.Left>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                setSideLeft("toc")
                                setNavOpen(false)
                            }}
                        >
                            <IconToc />
                        </button>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                setSideLeft("bookmarks")
                                setNavOpen(false)
                            }}
                        >
                            <IconBookmark />
                        </button>
                    </Navbar.Left>
                    <Navbar.Right>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                if (isFullscreen()) {
                                    document.exitFullscreen()
                                } else {
                                    document.documentElement.requestFullscreen()
                                }
                                setNavOpen(false)
                            }}
                        >
                            <Show when={isFullscreen()} fallback={<IconFullscreen />}>
                                <IconWindowed />
                            </Show>
                        </button>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                setSideLeft(null)
                                setSettingsOpen(true)
                            }}
                        >
                            <IconSettings />
                        </button>
                        <button class="cursor-pointer" onClick={() => navigate("/")}>
                            <IconExit />
                        </button>
                    </Navbar.Right>
                </Navbar>
            </Show>
            <Sidebar
                open={sideLeft() !== null}
                side="left"
                title={sideLeft() === "toc" ? "Table of Contents" : "Bookmarks"}
                overlay
                onClose={() => setSideLeft(null)}
            >
                <Show when={sideLeft() === "toc"}>
                    <For each={currBook()?.manifest.nav}>
                        {(item) => (
                            <p
                                class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-[var(--base00)]"
                                onClick={() => navigationGoTo(item.href)}
                            >
                                {item.text}
                            </p>
                        )}
                    </For>
                </Show>
                <Show when={sideLeft() === "bookmarks"}>
                    <div class="max-h-[90vh] overflow-y-auto">
                        <For each={currBook()?.bookmarks}>
                            {(b) => (
                                <p
                                    class="cursor-pointer text-sm px-2 py-1 rounded hover:bg-[var(--base00)]"
                                    onClick={() => {
                                        setSideLeft(null)
                                        document
                                            .querySelector(`p[index="${b.paragraphId}"]`)
                                            ?.scrollIntoView()
                                        updateChars()
                                    }}
                                >
                                    <span innerHTML={b.content} />
                                </p>
                            )}
                        </For>
                    </div>
                </Show>
            </Sidebar>
            <Sidebar
                side="right"
                overlay
                title="Settings"
                open={settingsOpen()}
                onClose={() => setSettingsOpen(false)}
            >
                <div class="space-y-4">
                    <ReaderSettings onSave={handleSettingsSave} />
                    <ThemeProvider>
                        <ThemeList selectOnly />
                    </ThemeProvider>
                </div>
            </Sidebar>
            <Show
                when={currBook()}
                fallback={<div class="h-screen w-screen p-8 text-center">Loading book…</div>}
            >
                <div
                    id="reader-container"
                    class={containerClass()}
                    ref={containerRef}
                    onClick={() => {
                        setSideLeft(null)
                        setNavOpen(false)
                    }}
                >
                    <div
                        id="reader-content"
                        ref={contentRef}
                        class={contentClass()}
                        style="font-size: var(--reader-font-size); line-height: var(--reader-line-height);"
                    />
                </div>
                <span
                    id="character-counter"
                    ref={charCounterRef}
                    class="z-10 right-[0.5rem] bottom-[0.5rem] fixed text-[0.75rem]"
                />
            </Show>
        </div>
    )
}
