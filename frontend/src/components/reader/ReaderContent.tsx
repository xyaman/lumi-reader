import { createEffect, createMemo, For, on, onCleanup, onMount, Show } from "solid-js"
import { IconBookmarkFull } from "@/components/icons"
import { useReaderDispatch, useReaderState } from "@/context/reader"
import { createReaderSettings } from "@/hooks"

function getBaseName(path: string) {
    const match = path.match(/(?:.*\/)?([^\/]+\.(?:png|jpe?g|svg|xhtml|html))$/i)
    return match ? match[1] : path
}

function patchImageUrls(html: string, imageMap: Map<string, string>): string {
    html = html.replace(/<img\s+[^>]*src="([^"]+)"[^>]*>/gi, (match, src) => {
        const base = getBaseName(src)
        const url = imageMap.get(base)
        if (url) return match.replace(`src="${src}"`, `src="${url}"`)
        return match
    })
    html = html.replace(/<image\s+[^>]*xlink:href="([^"]+)"[^>]*>/gi, (match, href) => {
        const base = getBaseName(href)
        const url = imageMap.get(base)
        if (url) return match.replace(`xlink:href="${href}"`, `xlink:href="${url}"`)
        return match
    })
    return html
}

/**
 * ReaderContent component displays the book content in the reader,
 * handling pagination and layout modes based on user settings.
 *
 * The Reader uses the following global CSS variables:
 */

export function ReaderContent(props: { imageMap: Map<string, string> }) {
    const state = useReaderState()
    const readerDispatch = useReaderDispatch()

    // -- hooks
    const [settings] = createReaderSettings(false, true)

    // -- html + styles related
    let containerRef: HTMLDivElement
    let contentRef: HTMLDivElement
    const containerDivStyle = createMemo(() => {
        const generalOpts = {} as const
        if (settings().paginated && settings().vertical) {
            return {
                ...generalOpts,
                "overflow-y": "hidden",
                margin: "auto",
                width: "100dvw",
                height: "100%",
            } as const
        } else if (!settings().paginated && settings().vertical) {
            // continuous vertical
            return {
                ...generalOpts,
                "overflow-y": "hidden",
                width: "100%",
                height: "100dvh",
            } as const
        } else {
            // continuous horizontal
            return {
                ...generalOpts,
                "overflow-x": "hidden",
                width: "100dvw",
                height: "100%",
            } as const
        }
    })
    const contentDivStyle = createMemo(() => {
        const vp = `${settings().verticalPadding}em`
        const hp = `${settings().horizontalPadding}em`

        // vertical-paginated
        const generalOpts = {
            "font-size": `${settings().fontSize}px`,
            "line-height": `${settings().lineHeight}`,
            padding: `${vp} ${hp}`,
        }

        if (settings().paginated && settings().vertical) {
            // paginated vertical
            return {
                ...generalOpts,
                "writing-mode": "vertical-rl",
                "overflow-x": "hidden",
                "overflow-y": "hidden",
                width: "100vw",
                height: `calc(100vh - 2em * 2)`, // 2em is an arbitrary number
                "column-gap": `calc((${vp}) * 2)`, // the gap should be twice the vertical padding to create an even margin
                "column-width": `calc(100vw - (${vp}) * 2)`,
                "column-fill": "auto",
            } as const
        } else if (settings().paginated && !settings().vertical) {
            // paginated horizontal
            return {
                ...generalOpts,
                "overflow-y": "hidden",
                "overflow-x": "hidden",
                height: "100dvh",
                width: "calc(100vw - 2em * 2)", // 2em is an arbitrary number
                "column-gap": `calc((${hp}) * 2)`, // the gap should be twice the horizontal padding to create an even margin
                "column-width": `calc(100vw - (${hp}) * 2)`,
                "column-fill": "auto",
            } as const
        } else if (!settings().paginated && settings().vertical) {
            // continuous vertical
            return {
                ...generalOpts,
                "writing-mode": "vertical-rl",
                "overflow-y": "hidden",
                height: `calc(100vh - 2em * 2)`, // 2em is an arbitrary number
            } as const
        } else {
            // continuous horizontal
            return {
                ...generalOpts,
                // "overflow-y": "hidden",
                height: "100%",
                width: `calc(100wh - 2em * 2)`, // 2em is an arbitrary number
            } as const
        }
    })

    /**
     * Adds/Remove a new bookmark, if the bookmark is already present it will be removed
     * @param id -
     * @param content -
     * @returns boolean true if value was present/removed, false otherwise
     */
    const toggleBookmark = (id: number | string, content: string) => {
        const idNum = Number(id)
        const idx = state.book.bookmarks.findIndex((b) => b.paragraphId === idNum)
        if (idx !== -1) {
            state.book.bookmarks.splice(idx, 1)
            return true
        } else {
            state.book.bookmarks.push({
                paragraphId: idNum,
                sectionName: state.book.sections[state.currSection].name,
                content,
            })
            return false
        }
    }

    // == bookmarks
    const setupBookmarks = () => {
        const ptags = document.querySelectorAll("p[index]")
        const bookmarksIds = state.book.bookmarks.map((b) => b.paragraphId)
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
                const bookmarksIds = state.book.bookmarks.map((b) => b.paragraphId)
                const index = Number(p.getAttribute("index"))
                label.textContent = bookmarksIds.includes(index) ? "Remove bookmark" : "Add bookmark"
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
                state.book.save()

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

    // -- action handlers
    const flipPage = (multiplier: 1 | -1) => {
        if (!contentRef) return

        let isStart: boolean
        let isEnd: boolean

        if (settings().vertical) {
            isStart = contentRef.scrollTop === 0
            isEnd = Math.ceil(contentRef.scrollTop + contentRef.clientHeight) >= contentRef.scrollHeight
        } else {
            isStart = contentRef.scrollLeft === 0
            isEnd = Math.ceil(contentRef.scrollLeft + contentRef.clientWidth) >= contentRef.scrollWidth
        }

        if (isStart && multiplier === -1) {
            if (state.currSection === 0) return
            readerDispatch.setSection(state.currSection - 1)

            // Scroll to end of previous section
            contentRef.scrollTo({ top: contentRef.scrollHeight, behavior: "instant" })
            readerDispatch.updateChars(isPaginated(), isVertical())
            return
        } else if (isEnd && multiplier === 1) {
            if (state.currSection === state.book.sections.length - 1) return
            readerDispatch.setSection(state.currSection + 1)

            // Scroll to beginning of next section
            contentRef.scrollTo({ top: 0, behavior: "instant" })
            readerDispatch.updateChars(isPaginated(), isVertical())
            return
        }

        const offset = settings().vertical ? contentRef.clientHeight : contentRef.clientWidth
        const current = settings().vertical ? contentRef.scrollTop : contentRef.scrollLeft
        const max = settings().vertical ? contentRef.scrollHeight : contentRef.scrollWidth
        const next = Math.max(0, Math.min(Math.ceil(current + offset * multiplier), max))

        const scrollToOpts = settings().vertical ? { top: next } : { left: next }
        contentRef.scrollTo({ ...scrollToOpts, behavior: "instant" })
        readerDispatch.updateChars(isPaginated(), isVertical())
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (settings().vertical) {
            if (e.key === "ArrowLeft") flipPage(1)
            else if (e.key === "ArrowRight") flipPage(-1)
        } else {
            if (e.key === "ArrowRight") flipPage(1)
            else if (e.key === "ArrowLeft") flipPage(-1)
        }

        if (e.key === "ArrowDown" || e.key === "PageDown") flipPage(1)
        else if (e.key === "ArrowUp" || e.key === "PageUp") flipPage(-1)
    }

    const handleWheelVerticalContinuous = (e: WheelEvent) => (containerRef.scrollLeft -= e.deltaY)
    const handleWheelPaginated = (e: WheelEvent) => {
        flipPage(e.deltaY > 0 ? 1 : -1)
    }

    // effects
    onMount(() => {
        document.addEventListener("keydown", handleKeyDown)
    })
    onCleanup(() => {
        document.removeEventListener("keydown", handleKeyDown)
    })

    const isPaginated = () => settings().paginated
    const isVertical = () => settings().vertical

    // this effect renders bookmarks every time a section changes
    const currSectionSignal = () => state.currSection
    createEffect(
        on(currSectionSignal, () => {
            if (settings().paginated) setupBookmarks()
        }),
    )

    // Settings and initializations related effects
    // This effect (re-)setups the reader every time paginated or vertical changes
    createEffect(
        on([isPaginated, isVertical], (values) => {
            const paginated = values[0]
            const vertical = values[1]

            // always scroll to the current position
            const handleScroll = () => readerDispatch.updateChars(isPaginated(), isVertical())
            let scrollTimer: number | null = null
            const handleScrollContinous = () => {
                if (scrollTimer !== null) clearTimeout(scrollTimer)
                scrollTimer = setTimeout(handleScroll, 300)
            }

            // always re-set global variables when the size changes
            // all <img> and <svg> uses these variables. Check `styles.css`
            const setupSizeCssVariables = () => {
                containerRef.style.setProperty(
                    "--reader-height",
                    `calc(${contentRef.clientHeight}px - 2 * ${settings().verticalPadding}em)`,
                )
                containerRef.style.setProperty(
                    "--reader-width",
                    `calc(${contentRef.clientWidth}px - 2 * ${settings().horizontalPadding}em)`,
                )
            }
            setupSizeCssVariables()
            document.addEventListener("resize", setupSizeCssVariables)
            onCleanup(() => {
                containerRef.style.removeProperty("--reader-height")
                containerRef.style.removeProperty("--reader-width")
                document.removeEventListener("resize", setupSizeCssVariables)
            })

            if (paginated) {
                // events listener
                containerRef.addEventListener("wheel", handleWheelPaginated)
                onCleanup(() => containerRef.removeEventListener("wheel", handleWheelPaginated))
            } else {
                // events listener
                containerRef.addEventListener("scroll", handleScrollContinous)
                if (vertical) containerRef.addEventListener("wheel", handleWheelVerticalContinuous)

                requestAnimationFrame(() => setupBookmarks())

                onCleanup(() => {
                    containerRef.removeEventListener("scroll", handleScrollContinous)
                    if (vertical) containerRef.removeEventListener("wheel", handleWheelVerticalContinuous)
                })
            }

            requestAnimationFrame(() => {
                const currPosition = state.book.currParagraph
                document.querySelector(`[index="${currPosition}"]`)?.scrollIntoView({ inline: "center" })
            })
        }),
    )

    // this effects adds/remove the book css
    createEffect(
        on(
            () => settings().disableCss,
            (disableCss) => {
                if (!disableCss) {
                    const bookStyle = state.book.getCssStyle()
                    bookStyle.id = "book-css"
                    document.head.appendChild(bookStyle)

                    onCleanup(() => {
                        document.head.querySelector("#book-css")?.remove()
                    })
                }
            },
        ),
    )

    return (
        <div
            ref={(ref) => (containerRef = ref)}
            style={containerDivStyle()}
            onClick={() => {
                readerDispatch.closeNavbar()
                readerDispatch.setSidebar(null)
            }}
        >
            <div id="reader-content" ref={(ref) => (contentRef = ref)} style={contentDivStyle()}>
                <Show
                    when={!settings().paginated}
                    fallback={
                        <div
                            innerHTML={patchImageUrls(state.book.sections[state.currSection].content, props.imageMap)}
                        />
                    }
                >
                    <For each={state.book.sections}>
                        {(section) => <div innerHTML={patchImageUrls(section.content, props.imageMap)} />}
                    </For>
                </Show>
            </div>
        </div>
    )
}
