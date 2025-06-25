import { vi, expect, it, describe, beforeEach, beforeAll } from "vitest"
import { render } from "@solidjs/testing-library"
import ReaderContent from "../src/components/ReaderContent"
import { setReaderSettingsStore } from "../src/components/ReaderSettings"
import { ReaderProvider } from "../src/context/reader"

const mockReaderStore = {
    book: {
        currParagraph: 0,
        bookmarks: [],
        images: [],
        sections: [
            {
                content: "<p index='0'>Hello World</p>",
                lastIndex: 1,
            },
        ],
        save: vi.fn(),
        findSectionIndex: vi.fn(() => 0),
        paragraphs: [{ index: 0, text: "Hello World" }],
    },
}

function renderWithContext() {
    return render(
        <ReaderProvider book={mockReaderStore.book}>
            <ReaderContent />
        </ReaderProvider>,
    )
}

describe("ReaderContent component", () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = vi.fn()
    })

    beforeEach(() => {
        setReaderSettingsStore({
            paginated: false,
            vertical: false,
            verticalPadding: 2,
            horizontalPadding: 2,
            showFurigana: false,
        })
    })

    it("renders with default settings (non-paginated, horizontal)", () => {
        const { container } = renderWithContext()
        const mainDiv = container.querySelector("#reader-container") as HTMLDivElement
        expect(mainDiv).not.toBeNull()
        expect(mainDiv.className).toContain("w-(--reader-horizontal-padding)")
    })

    it("updates layout when paginated + vertical is true", async () => {
        const { container } = renderWithContext()
        setReaderSettingsStore({ paginated: true, vertical: true })
        const mainDiv = container.querySelector("#reader-container") as HTMLDivElement
        expect(mainDiv.className).toContain("snap-y")
        expect(mainDiv.className).toContain("overflow-hidden")
    })

    it("updates layout when paginated + horizontal is true", async () => {
        const { container } = renderWithContext()
        setReaderSettingsStore({ paginated: true, vertical: false })
        const mainDiv = container.querySelector("#reader-container") as HTMLDivElement
        expect(mainDiv.className).toContain("overflow-x-hidden")
        expect(mainDiv.className).toContain("snap-x")
    })

    it("respects vertical padding changes", async () => {
        const { container } = renderWithContext()
        setReaderSettingsStore({ paginated: false, vertical: true, verticalPadding: 4 })
        const containerEl = container.querySelector("#reader-container") as HTMLDivElement
        expect(containerEl.className).toContain("h-(--reader-vertical-padding)")
    })

    it("respects horizontal padding changes", async () => {
        const { container } = renderWithContext()
        setReaderSettingsStore({ paginated: false, vertical: false, horizontalPadding: 4 })
        const containerEl = container.querySelector("#reader-container") as HTMLDivElement
        expect(containerEl.className).toContain("w-(--reader-horizontal-padding)")
    })

    it("applies vertical writing mode styles", async () => {
        const { container } = renderWithContext()
        setReaderSettingsStore({ paginated: true, vertical: true })
        const contentDiv = container.querySelector("#reader-content") as HTMLDivElement
        expect(contentDiv.className).toContain("writing-mode-vertical")
        expect(contentDiv.className).toContain("[column-width:100vw]")
    })
})
