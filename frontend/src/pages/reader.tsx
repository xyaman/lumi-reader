import { CharacterCounter } from "@/components/reader"
import ReaderNavbar from "@/components/reader/ReaderNavbar"
import { ReaderLeftSidebar, SettingsSidebar } from "@/components/reader/ReaderSidebar"
import { ReaderProvider, useReaderDispatch, useReaderState } from "@/context/reader"
import { LumiDb } from "@/db"
import { createReaderSettings } from "@/hooks"
import { EpubBook } from "@/lib/epub"
import { ReaderSource } from "@/lib/readerSource"
import { useNavigate, useParams } from "@solidjs/router"
import { createEffect, createMemo, createResource, createSignal, For, on, onCleanup, onMount, Show } from "solid-js"

function getBaseName(path: string) {
    const match = path.match(/(?:.*\/)?([^\/]+\.(?:png|jpe?g|svg|xhtml|html))$/i)
    return match ? match[1] : path
}

function patchImageUrls(html: string, imageMap: Map<string, string>): string {
    return html
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
    const readerState = useReaderState()
    const readerDispatch = useReaderDispatch()
    const book = () => readerState.book

    // -- hooks
    const [settings, setSettings] = createReaderSettings(false, true)

    // -- signals
    const [currentSection, setCurrentSection] = createSignal(0)

    // -- html + styles related
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
            } as const
        }
    })

    // -- action handlers
    const flipPage = (multiplier: 1 | -1) => {
        if (!contentRef) return

        let isStart: boolean
        let isEnd: boolean
        isStart = contentRef.scrollTop === 0
        isEnd = Math.ceil(contentRef.scrollTop + contentRef.clientHeight) >= contentRef.scrollHeight

        if (isStart && multiplier === -1) {
            if (currentSection() === 0) return
            setCurrentSection((prev) => prev - 1)
            book()!.sections[currentSection()].lastIndex - 1

            // Scroll to end of previous section
            contentRef.scrollTo({ top: contentRef.scrollHeight, behavior: "instant" })
            return
        } else if (isEnd && multiplier === 1) {
            if (currentSection() + 1 === book()?.sections.length) return
            setCurrentSection((prev) => prev + 1)

            // Scroll to beginning of next section
            contentRef.scrollTo({ top: 0, behavior: "instant" })
            return
        }

        const offset = contentRef.clientHeight
        const current = contentRef.scrollTop
        const max = contentRef.scrollHeight
        const next = Math.max(0, Math.min(Math.ceil(current + offset * multiplier), max))
        contentRef.scrollTo({ top: next, behavior: "instant" })
    }
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") flipPage(1)
        else if (e.key === "ArrowRight" || e.key === "ArrowUp") flipPage(-1)
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
    createEffect(
        on([isPaginated, isVertical], () => {
            // always scroll to the current position
        }),
    )

    return (
        <div
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
                        <div innerHTML={patchImageUrls(book()!.sections[currentSection()].content, props.imageMap)} />
                    }
                >
                    <For each={book()!.sections}>
                        {(section) => <div innerHTML={patchImageUrls(section.content, props.imageMap)} />}
                    </For>
                </Show>
            </div>

            <div class="sticky bottom-0 left-0 w-full bg-black bg-opacity-50 text-white p-2 text-center flex justify-center items-center gap-6">
                <div class="flex items-center gap-2">
                    <label>V-Pad</label>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={settings().verticalPadding}
                        onInput={(e) => setSettings("verticalPadding", Number(e.currentTarget.value))}
                    />
                </div>
                <div class="flex items-center gap-2">
                    <label>H-Pad</label>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={settings().horizontalPadding}
                        onInput={(e) => setSettings("horizontalPadding", Number(e.currentTarget.value))}
                    />
                </div>
            </div>
        </div>
    )
}
