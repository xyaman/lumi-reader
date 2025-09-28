import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js"
import { useReaderDispatch, useReaderState } from "@/context/reader"
import { createReaderSettings } from "@/hooks"
import { ContextMenu } from "./ContextMenu"

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
    const [menuState, setMenuState] = createSignal({ visible: false, x: 0, y: 0, target: null as HTMLElement | null })

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
        const vp = `${window.innerHeight * (settings().verticalPadding / 100)}px`
        const hp = `${window.innerWidth * (settings().horizontalPadding / 100)}px`

        // vertical-paginated
        const generalOpts = {
            margin: "auto",
            "font-family": `${settings().fontFamily}`,
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
                width: "var(--reader-width, 100vw)",
                height: "calc(var(--reader-height, 100vh) - 2em * 2)", // 2em is an arbitrary number
                "column-gap": `calc(${vp} * 2)`, // the gap should be twice the vertical padding to create an even margin
                "column-width": `calc(var(--reader-width, 100vw) - ${vp} * 2)`,
                "column-fill": "auto",
            } as const
        } else if (settings().paginated && !settings().vertical) {
            // paginated horizontal
            return {
                ...generalOpts,
                "overflow-y": "hidden",
                "overflow-x": "hidden",
                height: "var(--reader-height, 100vh)",
                width: "calc(var(--reader-width, 100vw) - 2em * 2)",
                "column-gap": `calc(${hp} * 2)`, // the gap should be twice the horizontal padding to create an even margin
                "column-width": `calc(var(--reader-width, 100vw) - ${hp} * 2)`,
                "column-fill": "auto",
            } as const
        } else if (!settings().paginated && settings().vertical) {
            // continuous vertical
            return {
                ...generalOpts,
                "writing-mode": "vertical-rl",
                "overflow-y": "hidden",
                height: `calc(--reader-height - 2em * 2)`, // 2em is an arbitrary number
            } as const
        } else {
            // continuous horizontal
            return {
                ...generalOpts,
                // "overflow-y": "hidden",
                height: "100%",
                width: `calc(--reader-width - 2em * 2)`, // 2em is an arbitrary number
            } as const
        }
    })

    const handleContextMenu = (e: MouseEvent) => {
        if (menuState().visible && e.target === menuState().target) {
            setMenuState((prev) => prev && { ...prev, visible: false })
            return
        }

        const targetParagraph = (e.target as HTMLElement).closest<HTMLElement>("p[index]")
        if (targetParagraph) {
            e.preventDefault()
            setMenuState({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                target: targetParagraph,
            })
        }
    }

    // == Highlight existing bookmarks on render/section change
    const highlightBookmarkedParagraphs = () => {
        const bookmarksIds = new Set(state.book.bookmarks.map((b) => b.paragraphId))
        const ptags = contentRef.querySelectorAll("p[index]")
        const bgcolor = "bg-base01"

        for (const p of ptags) {
            const index = Number(p.getAttribute("index"))
            if (bookmarksIds.has(index)) {
                p.classList.add(bgcolor)
            } else {
                p.classList.remove(bgcolor)
            }
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
            if (settings().vertical) {
                contentRef.scrollTo({ top: contentRef.scrollHeight, behavior: "instant" })
            } else {
                contentRef.scrollTo({ left: contentRef.scrollWidth, behavior: "instant" })
            }
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

    // Touch devices: left-right swipe
    // vertical: left -> next page / right -> previous page
    // horizontal: right -> next page / left -> previous page
    let startX = 0
    const handleTouchStart = (e: TouchEvent) => (startX = e.touches[0].clientX)
    const handleTouchEnd = (e: TouchEvent) => {
        const delta = e.changedTouches[0].clientX - startX
        if (Math.abs(delta) > 50) {
            if (isVertical()) {
                flipPage(delta < 0 ? -1 : 1)
            } else {
                flipPage(delta < 0 ? 1 : -1)
            }
        }
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
        containerRef.addEventListener("contextmenu", handleContextMenu)
    })

    onCleanup(() => {
        document.removeEventListener("keydown", handleKeyDown)
        containerRef.removeEventListener("contextmenu", handleContextMenu)
    })

    const isPaginated = () => settings().paginated
    const isVertical = () => settings().vertical

    // this effect renders bookmarks every time a section changes
    const currSectionSignal = () => state.currSection
    createEffect(on(currSectionSignal, () => requestAnimationFrame(highlightBookmarkedParagraphs)))

    // Settings and initializations related effects
    // This effect (re-)setups the reader every time paginated or vertical changes
    createEffect(
        on([isPaginated, isVertical], (values) => {
            const paginated = values[0]
            const vertical = values[1]

            // continous mode onlye
            // paginated mode uses flipPage directly
            const handleScroll = () => readerDispatch.updateChars(isPaginated(), isVertical())
            let scrollTimer: number | null = null
            const handleScrollContinous = () => {
                if (scrollTimer !== null) clearTimeout(scrollTimer)
                scrollTimer = setTimeout(handleScroll, 300)
            }

            // always re-set global variables when the size changes
            // all <img> and <svg> uses these variables. Check `styles.css`
            // also resets the scroll so columns are always aligned
            const handleResize = () => {
                containerRef.style.setProperty("--reader-height", `${window.innerHeight}px`)
                containerRef.style.setProperty("--reader-width", `${window.innerWidth}px`)

                containerRef.style.setProperty(
                    "--reader-image-height",
                    `calc(${window.innerHeight - 2 * window.innerHeight * (settings().verticalPadding / 100)}px - 2em)`,
                )
                containerRef.style.setProperty(
                    "--reader-image-width",
                    `calc(${window.innerWidth - 2 * window.innerWidth * (settings().horizontalPadding / 100)}px - 2em)`,
                )

                // adjust scroll after resize
                if (paginated && !vertical) {
                    const col = Math.round(contentRef.scrollLeft / contentRef.clientWidth)
                    contentRef.scrollLeft = col * contentRef.clientWidth
                } else if (paginated && vertical) {
                    const col = Math.round(contentRef.scrollTop / contentRef.clientHeight)
                    contentRef.scrollTop = col * contentRef.clientHeight
                }
            }
            handleResize()
            window.addEventListener("resize", handleResize)
            onCleanup(() => {
                containerRef.style.removeProperty("--reader-height")
                containerRef.style.removeProperty("--reader-width")
                containerRef.style.removeProperty("--reader-image-height")
                containerRef.style.removeProperty("--reader-image-width")
                window.removeEventListener("resize", handleResize)
            })

            if (paginated) {
                // events listener
                containerRef.addEventListener("touchstart", handleTouchStart)
                containerRef.addEventListener("touchend", handleTouchEnd)
                containerRef.addEventListener("wheel", handleWheelPaginated)
                onCleanup(() => {
                    containerRef.removeEventListener("touchstart", handleTouchStart)
                    containerRef.removeEventListener("touchend", handleTouchEnd)
                    containerRef.removeEventListener("wheel", handleWheelPaginated)
                })
            } else {
                // events listener
                containerRef.addEventListener("scroll", handleScrollContinous)
                if (vertical) containerRef.addEventListener("wheel", handleWheelVerticalContinuous)

                requestAnimationFrame(highlightBookmarkedParagraphs)

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

    // this effect show/hide furigana
    createEffect(on(() => settings().showFurigana ,(showFurigana) => {
        const furiganaTextRef: HTMLElement[] = [...document.querySelectorAll("rt")]
        if(!showFurigana) {
            furiganaTextRef.forEach(item => {item.style.display = "none"})
        } else {
            furiganaTextRef.forEach(item => {item.removeAttribute("style")})
        }
    }))

    return (
        <>
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
                                innerHTML={patchImageUrls(
                                    state.book.sections[state.currSection].content,
                                    props.imageMap,
                                )}
                            />
                        }
                    >
                        <For each={state.book.sections}>
                            {(section) => <div innerHTML={patchImageUrls(section.content, props.imageMap)} />}
                        </For>
                    </Show>
                </div>
            </div>

            {/* Render the context menu */}
            <ContextMenu menuState={menuState()} onClose={() => setMenuState({ ...menuState(), visible: false })} />
        </>
    )
}
