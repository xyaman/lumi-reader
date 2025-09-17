import { CharacterCounter } from "@/components/reader"
import { ReaderContent } from "@/components/reader/ReaderContent"
import ReaderNavbar from "@/components/reader/ReaderNavbar"
import { ReaderLeftSidebar, SettingsSidebar } from "@/components/reader/ReaderSidebar"
import { ReaderProvider } from "@/context/reader"
import { LumiDb } from "@/db"
import { EpubBook } from "@/lib/epub"
import { ReaderSource } from "@/lib/readerSource"
import { useNavigate, useParams } from "@solidjs/router"
import { createResource, onCleanup, Show } from "solid-js"

function getBaseName(path: string) {
    const match = path.match(/(?:.*\/)?([^\/]+\.(?:png|jpe?g|svg|xhtml|html))$/i)
    return match ? match[1] : path
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
                <ReaderContent imageMap={imageMap} />
            </ReaderProvider>
        </Show>
    )
}
