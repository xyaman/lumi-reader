import { useReaderContext } from "@/context/reader"
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js"
import { IconBookmarkFull } from "./icons"

function getBaseName(path: string) {
    const match = path.match(/(?:.*\/)?([^\/]+\.(?:png|jpe?g|svg|xhtml|html))$/i)
    return match ? match[1] : path
}

/**
 * ReaderContent component displays the book content in the reader,
 * handling pagination and layout modes based on user settings.
 *
 * The Reader uses the following global CSS variables:
 * - --reader-vertical-padding
 * - --reader-horizontal-padding
 * - --reader-font-size
 * - --reader-line-height
 */
export default function ReaderContent() {
    const { updateChars, readerStore, setReaderStore } = useReaderContext()

    console.log(readerStore.book)

    let containerRef: HTMLDivElement | undefined

    // The lastest value is always in the local storage
    const [isPaginated, setIsPaginated] = createSignal(
        localStorage.getItem("reader:paginated") === "true",
    )
    const [isVertical, setIsVertical] = createSignal(
        localStorage.getItem("reader:vertical") === "true",
    )

    const [showFurigana, setShowFurigana] = createSignal(
        localStorage.getItem("reader:showFurigana") === "true",
    )

    let shouldUpdateChars = false

    // == component classes
    const mainClass = () =>
        isPaginated()
            ? isVertical()
                ? "h-screen flex items-center"
                : "h-screen flex center"
            : isVertical()
              ? "h-[95vh] flex items-center"
              : ""

    const containerClass = () =>
        !isPaginated()
            ? isVertical()
                ? "h-(--reader-vertical-padding) my-auto"
                : "w-(--reader-horizontal-padding) mx-auto" // continous - (horizontal & vertical)
            : isVertical()
              ? "relative mx-auto w-(--reader-horizontal-padding) h-(--reader-vertical-padding) overflow-hidden snap-y snap-mandatory"
              : "relative mx-auto my-auto w-(--reader-horizontal-padding) h-(--reader-vertical-padding) overflow-x-hidden snap-x snap-mandatory"

    const contentClass = () =>
        !isPaginated()
            ? isVertical()
                ? "writing-mode-vertical"
                : "h-full"
            : isVertical()
              ? "h-full w-full [column-width:100vw] [column-fill:auto] [column-gap:0px] text-[20px] writing-mode-vertical"
              : "h-full [column-width:100vw] [column-fill:auto] [column-gap:0px]"

    // == media
    const showImages = () => {
        if (!containerRef) return

        // Update all <img>, <svg image>, and <image> tags with correct URLs
        const updateImageSrc = (el: Element, attr: string) => {
            const val = el.getAttribute(attr)
            if (!val) return

            const base = getBaseName(val)
            const image = readerStore.book.images.find((v) => getBaseName(v.filename) === base)
            if (image && image.url) el.setAttribute(attr, image.url)
        }

        setTimeout(() => {
            // <img src="">
            containerRef.querySelectorAll("img[src]").forEach((el) => updateImageSrc(el, "src"))
            // <image xlink:href="">
            containerRef.querySelectorAll("image").forEach((el) => updateImageSrc(el, "xlink:href"))
        })
    }

    // == pagination
    const flipPage = (multiplier: 1 | -1) => {
        if (!containerRef) return

        // are we at the end?
        let isStart: boolean
        let isEnd: boolean

        if (isVertical()) {
            isStart = containerRef.scrollTop === 0
            isEnd =
                Math.ceil(containerRef.scrollTop + containerRef.clientHeight) >=
                containerRef.scrollHeight
        } else {
            isStart = containerRef.scrollLeft === 0
            isEnd =
                Math.ceil(containerRef.scrollLeft + containerRef.clientWidth) >=
                containerRef.scrollWidth
        }

        if (isStart && multiplier === -1) {
            if (readerStore.currSection === 0) return
            setReaderStore("currSection", readerStore.currSection - 1)
            const nextId = readerStore.book.sections[readerStore.currSection].lastIndex - 1
            // scroll into last item of the xhtml
            document.querySelector(`p[index="${nextId}"]`)?.scrollIntoView()
            return
        } else if (isEnd && multiplier === 1) {
            if (readerStore.currSection === readerStore.book.sections.length - 1) return
            setReaderStore("currSection", readerStore.currSection + 1)

            // scroll into the first item of the xtml
            const nextId = readerStore.book.sections[readerStore.currSection].lastIndex
            document.querySelector(`p[index="${nextId}"]`)?.scrollIntoView()
            return
        }

        const offset = isVertical() ? containerRef.clientHeight : containerRef.clientWidth
        const current = isVertical() ? containerRef.scrollTop : containerRef.scrollLeft
        const max = isVertical() ? containerRef.scrollHeight : containerRef.scrollWidth
        const next = Math.max(0, Math.min(Math.ceil(current + offset * multiplier), max))
        const scrollToOpts = isVertical() ? { top: next } : { left: next }
        containerRef.scrollTo({ ...scrollToOpts, behavior: "instant" })
    }

    /**
     * Adds/Remove a new bookmark, if the bookmark is already present it will be removed
     * @param id -
     * @param content -
     * @returns boolean true if value was present/removed, false otherwise
     */
    const toggleBookmark = (id: number | string, content: string) => {
        const idNum = Number(id)
        const idx = readerStore.book.bookmarks.findIndex((b) => b.paragraphId === idNum)
        if (idx !== -1) {
            readerStore.book.bookmarks.splice(idx, 1)
            return true
        } else {
            readerStore.book.bookmarks.push({ paragraphId: idNum, content })
            return false
        }
    }

    // == bookmarks
    const setupBookmarks = () => {
        const ptags = document.querySelectorAll("p[index]")
        const bookmarksIds = readerStore.book.bookmarks.map((b) => b.paragraphId)
        const bgcolor = "bg-[var(--base01)]"

        // if already has bookmark icon, remove it and return
        // otherwise show bookmark icon.
        // if bookmark icon is pressed, toggle bookmark status and save
        const highlight = (p: Element) => {
            // if current <p> is selected, unselect (hide icon)
            if (p.children.length) {
                const hasIcon = Array.from(p.children).filter((p) => p.id === "bookmark-icon")
                if (hasIcon.length === 1) {
                    document.getElementById("bookmark-icon")?.remove()
                    return
                }
            }

            // hide icon if there was another <p> selected
            document.getElementById("bookmark-icon")?.remove()

            const bookmarkSpan = document.createElement("span")
            bookmarkSpan.id = "bookmark-icon"

            bookmarkSpan.className =
                "absolute z-10 right-1 w-[40px] h-[40px] cursor-pointer rounded-lg p-1 bg-[var(--base01)] bg-opacity-80 border border-[var(--base03)] shadow-lg transition-transform duration-150 hover:scale-110 hover:bg-[var(--base02)]"

            if (isVertical()) {
                bookmarkSpan.className += "bottom-0"
            } else {
                bookmarkSpan.className += "top-0"
            }

            const label = document.createElement("span")
            label.textContent = "Add to bookmark"
            // label.textContent = p.getAttribute("bookmarked") ? "Remove bookmark" : "Add to bookmark"
            label.className =
                "absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--base02)] text-xs text-[var(--base06)] opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100"

            // Make the icon a hover group
            bookmarkSpan.className += " group"

            // Show label on hover
            bookmarkSpan.onmouseover = () => {
                p.classList.add("bg-[var(--base02)]")
                label.style.opacity = "1"
                const bookmarksIds = readerStore.book.bookmarks.map((b) => b.paragraphId)
                const index = Number(p.getAttribute("index"))
                label.textContent = bookmarksIds.includes(index)
                    ? "Remove bookmark"
                    : "Add bookmark"
            }
            bookmarkSpan.onmouseleave = () => {
                p.classList.remove("bg-[var(--base02)]")
                label.style.opacity = "0"
            }

            bookmarkSpan.appendChild(IconBookmarkFull() as HTMLElement)
            bookmarkSpan.appendChild(label)

            bookmarkSpan.onclick = () => {
                // solid-js makes a re-render and the bookmark is re-generated
                // to avoid this, we schedule the remove to after the render
                setTimeout(() => document.getElementById("bookmark-icon")?.remove(), 0)

                const index = p.getAttribute("index")!
                const removed = toggleBookmark(index, p.textContent!)
                removed ? p.classList.remove(bgcolor) : p.classList.add(bgcolor)
                readerStore.book.save()

                // when clicked, onmouseleave is not called
                p.classList.remove("bg-[var(--base02)]")
            }

            p.appendChild(bookmarkSpan)
        }

        for (const p of ptags) {
            if (p.textContent === "") continue
            p.addEventListener("click", () => highlight(p))
            p.classList.add("relative")

            // setup initial state
            const index = Number(p.getAttribute("index"))
            if (bookmarksIds.includes(index)) p.classList.add(bgcolor)
        }
    }

    createEffect(() => {
        if (isVertical() && isPaginated()) {
            setTimeout(() => {
                const currPosition = readerStore.book.currParagraph
                document.querySelector(`p[index="${currPosition}"]`)?.scrollIntoView()
            }, 0)
        }
    })

    // Sets up pagination event listeners (touch, keyboard, scroll)
    // - When paginated: adds touch, keydown, and scroll listeners to container/document
    // - When not paginated: adds scroll listener to document only
    // Cleans up listeners when pagination is disabled or component unmounts.
    createEffect(
        on(isPaginated, () => {
            if (!containerRef) return

            const handleScroll = () => updateChars(isPaginated(), isVertical())

            let scrollTimer: number | null = null
            const handleScrollContinous = () => {
                if (scrollTimer !== null) clearTimeout(scrollTimer)
                scrollTimer = setTimeout(handleScroll, 300)
            }

            // Touch devices: left-right swipe
            let startX = 0
            const handleTouchStart = (e: TouchEvent) => (startX = e.touches[0].clientX)
            const handleTouchEnd = (e: TouchEvent) => {
                const delta = e.changedTouches[0].clientX - startX
                if (Math.abs(delta) > 50) flipPage(delta < 0 ? 1 : -1)
            }

            // Keyboard handler: flip page with arrow keys
            const handleKeyDown = (e: KeyboardEvent) => {
                if (isVertical()) {
                    if (e.key === "ArrowLeft") flipPage(1)
                    else if (e.key === "ArrowRight") flipPage(-1)
                } else {
                    if (e.key === "ArrowRight") flipPage(1)
                    else if (e.key === "ArrowLeft") flipPage(-1)
                }
                if (e.key === "ArrowDown") flipPage(1)
                else if (e.key === "ArrowUp") flipPage(-1)
            }

            const handleResize = () => {
                setTimeout(() => {
                    containerRef.style.height = "0px"
                    containerRef.style.removeProperty("height")
                    document
                        .querySelector(`p[index='${readerStore.book.currParagraph}']`)
                        ?.scrollIntoView()
                }, 0)
            }

            const handleWheel = (e: WheelEvent) => (document.documentElement.scrollLeft -= e.deltaY)

            if (isPaginated()) {
                // update last xhtml
                const newSection = readerStore.book.findSectionIndex(readerStore.book.currParagraph)
                if (readerStore.currSection != newSection && newSection) {
                    setReaderStore("currSection", newSection)
                }

                containerRef.addEventListener("touchstart", handleTouchStart)
                containerRef.addEventListener("touchend", handleTouchEnd)
                document.addEventListener("keydown", handleKeyDown)

                containerRef.addEventListener("scroll", handleScroll)
                window.addEventListener("resize", handleResize)

                onCleanup(() => {
                    containerRef.removeEventListener("touchstart", handleTouchStart)
                    containerRef.removeEventListener("touchend", handleTouchEnd)
                    document.removeEventListener("keydown", handleKeyDown)

                    // scroll to containerRef
                    containerRef.removeEventListener("scroll", handleScroll)
                    window.removeEventListener("resize", handleResize)
                })
            } else {
                setTimeout(() => {
                    showImages()
                    setupBookmarks()
                }, 0)

                // if is vertical, map wheel event
                if (isVertical()) containerRef.addEventListener("wheel", handleWheel)
                document.addEventListener("scroll", handleScrollContinous)
                onCleanup(() => {
                    containerRef.removeEventListener("wheel", handleWheel)
                    document.removeEventListener("scroll", handleScrollContinous)
                })
            }

            // wait to next render
            setTimeout(() => {
                const currPosition = readerStore.book.currParagraph
                document.querySelector(`p[index="${currPosition}"]`)?.scrollIntoView()
            }, 0)
        }),
    )

    // Update furigana
    createEffect(() => {
        if (!showFurigana()) {
            document.querySelectorAll("rt").forEach((rt) => (rt.style.display = "none"))
        } else {
            document.querySelectorAll("rt").forEach((rt) => rt.style.removeProperty("display"))
        }
    })

    // Update local state when settings changes
    // ref: `ReaderSettings.tsx`
    createEffect(() => {
        if (readerStore.shouldReload == true) {
            setReaderStore("shouldReload", false)
            setIsPaginated(localStorage.getItem("reader:paginated") === "true")
            setIsVertical(localStorage.getItem("reader:vertical") === "true")

            const newFurigana = localStorage.getItem("reader:showFurigana") === "true"
            if (newFurigana !== showFurigana()) {
                setShowFurigana((prev) => !prev)
            }
        }
    })

    // update every time xhtml changes
    // This should be triggered when using paginated mode
    // or when changing the current xhtml
    const currSectionSignal = () => readerStore.currSection
    createEffect(
        on(currSectionSignal, () => {
            if (!isPaginated()) return
            showImages()
            setupBookmarks()

            if (!shouldUpdateChars) {
                shouldUpdateChars = true
                return
            }
            updateChars(isPaginated(), isVertical())
        }),
    )

    return (
        <div class={mainClass()}>
            <div
                id="reader-container"
                ref={containerRef}
                class={containerClass()}
                onClick={() => {
                    setReaderStore("sideBar", null)
                    setReaderStore("navOpen", false)
                }}
            >
                <div
                    id="reader-content"
                    class={contentClass()}
                    style="font-size: var(--reader-font-size); line-height: var(--reader-line-height);"
                >
                    <Show
                        when={!isPaginated()}
                        fallback={
                            <div
                                innerHTML={
                                    readerStore.book.sections[readerStore.currSection].content ??
                                    "error??"
                                }
                            />
                        }
                    >
                        <For each={readerStore.book.sections}>
                            {(x) => {
                                return <div innerHTML={x.content} />
                            }}
                        </For>
                    </Show>
                </div>
            </div>
        </div>
    )
}
