import { createEffect, onCleanup, onMount, Show } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "@/lib/epub"
import { readerStore, setReaderStore } from "@/stores/readerStore"
import Sidebar, {
    BookmarksSidebarContent,
    SettingsSidebar,
    TocSidebarContent,
} from "@/components/Sidebar"
import { IconBookmarkFull } from "@/components/icons"
import ReaderNavbar from "./components/ReaderNavbar"

function CharacterCounter(props: { ref: (el: HTMLElement) => void }) {
    return <span ref={props.ref} class="z-10 right-[0.5rem] bottom-[0.5rem] fixed text-[0.75rem]" />
}

export function useBook(id: number) {
    const navigate = useNavigate()

    onMount(async () => {
        if (readerStore.currBook) return
        const record = await EpubBook.getById(id)
        if (!record) {
            navigate("/", { replace: true })
            return
        }
        const book = EpubBook.fromRecord(record)
        setReaderStore("currBook", book)
    })

    return () => readerStore.currBook
}

export default function BookReader() {
    const params = useParams()
    const id = Number(params.id)

    const navigate = useNavigate()
    if (!id) navigate("/", { replace: true })

    const currBook = useBook(id)
    onCleanup(() => setReaderStore("currBook", null))

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
        setReaderStore("navOpen", false)
        setReaderStore("sideLeft", null)
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
        setReaderStore("settingsOpen", false)
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
            book.renderContent(contentRef, { xhtml: "all" })
            book.insertCss()

            requestAnimationFrame(() => {
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
            })
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
            const blobs = currBook()?.blobs
            if (!blobs) return
            Object.values(blobs).forEach((url) => URL.revokeObjectURL(url))
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

    // Prevent to scroll when at least one of the sidebars is open
    createEffect(() => {
        document.body.style.overflow =
            readerStore.sideLeft !== null || readerStore.settingsOpen ? "hidden" : ""
    })

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
            {/* Navbar: it is only shown when top side is clicked, it hides when clicking anywhere in the screen */}
            <ReaderNavbar />

            {/* Sidebars */}
            <Sidebar
                open={readerStore.sideLeft !== null}
                side="left"
                title={readerStore.sideLeft === "toc" ? "Table of Contents" : "Bookmarks"}
                overlay
                onClose={() => setReaderStore("sideLeft", null)}
            >
                <Show when={readerStore.sideLeft === "toc"}>
                    <TocSidebarContent goTo={navigationGoTo} />
                </Show>
                <Show when={readerStore.sideLeft === "bookmarks"}>
                    <BookmarksSidebarContent
                        onItemClick={(paragraphId) => {
                            document.querySelector(`p[index="${paragraphId}"]`)?.scrollIntoView()
                            updateChars()
                        }}
                    />
                </Show>
            </Sidebar>

            <SettingsSidebar
                side="right"
                overlay
                title="Settings"
                open={readerStore.settingsOpen}
                onSave={handleSettingsSave}
                onClose={() => setReaderStore("settingsOpen", false)}
            />

            {/* BookContent */}
            <Show
                when={currBook()}
                fallback={<div class="h-screen w-screen p-8 text-center">Loading book…</div>}
            >
                <div
                    id="reader-container"
                    class={containerClass()}
                    ref={containerRef}
                    onClick={() => {
                        setReaderStore("sideLeft", null)
                        setReaderStore("navOpen", false)
                    }}
                >
                    <div
                        id="reader-content"
                        ref={contentRef}
                        class={contentClass()}
                        style="font-size: var(--reader-font-size); line-height: var(--reader-line-height);"
                    />
                </div>

                <CharacterCounter ref={(el) => (charCounterRef = el)} />
            </Show>
        </div>
    )
}
