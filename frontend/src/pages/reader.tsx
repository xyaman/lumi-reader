import { CharacterCounter } from "@/components/reader"
import ReaderNavbar from "@/components/reader/ReaderNavbar"
import { ReaderLeftSidebar, SettingsSidebar } from "@/components/reader/ReaderSidebar"
import { ReaderProvider, useReaderDispatch, useReaderState } from "@/context/reader"
import { LumiDb } from "@/db"
import { createReaderSettings } from "@/hooks"
import { EpubBook } from "@/lib/epub"
import { ReaderSource } from "@/lib/readerSource"
import { useNavigate, useParams } from "@solidjs/router"
import { createEffect, createMemo, createResource, For, on, onCleanup, onMount, Show } from "solid-js"

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

// BookReader component for displaying and managing the reading experience of an EPUB book.
export function BookReader() {
    const params = useParams()
    const navigate = useNavigate()

    const id = Number(params.id)
    if (!id) navigate("/", { replace: true })

    let imageMap = new Map<string, string>()
    const [book] = createResource(async () => {
        const record = await LumiDb.getBookById(id)

        if (record && record.kind === "epub") {
            const book = EpubBook.fromReaderSourceRecord(record)
            imageMap = new Map<string, string>(
                book.images.filter((img) => img.url).map((img) => [getBaseName(img.filename), img.url!]),
            )
            return book as ReaderSource
        } else {
            navigate("/", { replace: true })
            return
        }
    })

    onCleanup(() => book()?.deinit())

    return (
        <Show when={book()} fallback={<p>Loading...</p>}>
            <ReaderProvider book={book()!}>
                <ReaderNavbar />
                <ReaderLeftSidebar />
                <SettingsSidebar />
                <CharacterCounter />
                <NewReaderContent imageMap={imageMap} />
            </ReaderProvider>
        </Show>
    )
}

function NewReaderContent(props: { imageMap: Map<string, string> }) {
    const state = useReaderState()
    const readerDispatch = useReaderDispatch()

    // -- hooks
    const [settings] = createReaderSettings(false, true)

    // -- html + styles related
    let containerRef: HTMLDivElement
    let contentRef: HTMLDivElement
    const containerDivStyle = createMemo(() => {
        const generalOpts = {} as const
        if (!settings().paginated && settings().vertical) {
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
            "line-height": "1.7",
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

    // This effect (re-)setups the reader every time paginated or vertical changes
    createEffect(
        on([isPaginated, isVertical], () => {
            // always scroll to the current position
            const handleScroll = () => readerDispatch.updateChars(isPaginated(), isVertical())
            let scrollTimer: number | null = null
            const handleScrollContinous = () => {
                if (scrollTimer !== null) clearTimeout(scrollTimer)
                scrollTimer = setTimeout(handleScroll, 300)
            }

            if (settings().paginated) {
                // events listener
                containerRef.addEventListener("wheel", handleWheelPaginated)
                onCleanup(() => {
                    containerRef.removeEventListener("wheel", handleWheelPaginated)
                })
            } else {
                // events listener
                containerRef.addEventListener("scroll", handleScrollContinous)

                if (settings().vertical) {
                    containerRef.addEventListener("wheel", handleWheelVerticalContinuous)
                }

                onCleanup(() => {
                    containerRef.removeEventListener("scroll", handleScrollContinous)
                    containerRef.removeEventListener("wheel", handleWheelVerticalContinuous)
                })
            }

            requestAnimationFrame(() => {
                const currPosition = state.book.currParagraph
                document.querySelector(`[index="${currPosition}"]`)?.scrollIntoView()
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
