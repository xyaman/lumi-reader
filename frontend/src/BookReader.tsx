import { useNavigate, useParams } from "@solidjs/router"
import { EpubBook } from "./lib/epub"
import { createSignal, onCleanup } from "solid-js"

export default function BookReader() {
    const params = useParams()
    const navigate = useNavigate()
    let contentRef: HTMLDivElement | undefined

    let [imgUrls, setImgUrls] = createSignal<string[]>([])

    if (!params.id) {
        navigate("/", { replace: true })
    }

    const id = parseInt(params.id)
    EpubBook.getById(id)
        .then((record) => {
            if (!record) {
                console.log("book with id:", id, "not found")
                navigate("/", { replace: true })
                return
            }

            const book = EpubBook.fromRecord(record)
            if (book && contentRef) {
                book.renderContent(contentRef).then((urls) => setImgUrls(urls))
                book.insertCss()
            }
        })
        .catch((e) => {
            console.log("Error when fetching book:", e)
            navigate("/", { replace: true })
        })

    onCleanup(() => {
        console.log(imgUrls())
        for (const url of imgUrls()) {
            URL.revokeObjectURL(url)
        }

        document.head.querySelectorAll("#temp-css").forEach((style) => style.remove())
    })

    return (
        <div class="bg-gray-300">
            <h1>Reader</h1>
            <p>Book id: {params.id}</p>
            <div ref={(el) => (contentRef = el)}></div>
        </div>
    )
}
