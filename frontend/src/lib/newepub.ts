import { Bookmark, NavigationItem, ReaderSource } from "./readerSource"

class EpubBook implements ReaderSource {
    localId!: number
    uniqueId!: string
    creationDate!: number
    lastModifiedDate!: number
    title!: string
    language!: string
    creator: string[] = []
    totalChars!: number
    currChars!: number
    currParagraph!: number

    getAllContent(): string[] {
        throw new Error("Method not implemented.")
    }
    getContentBySection(index: number): string | null | undefined {
        throw new Error("Method not implemented.")
    }
    getBookmarks(): Bookmark[] {
        throw new Error("Method not implemented.")
    }
    getNavigation(): NavigationItem[] {
        throw new Error("Method not implemented.")
    }
    getImages(): void {
        throw new Error("Method not implemented.")
    }
    getCssStyle(): HTMLStyleElement {
        throw new Error("Method not implemented.")
    }
    save(): void {
        throw new Error("Method not implemented.")
    }
    deinit(): void {
        throw new Error("Method not implemented.")
    }
}
