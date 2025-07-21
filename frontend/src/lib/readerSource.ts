import { type SyncedBook } from "@/api/syncedBooks"

/**
 * Represents a source for the reader, such as an EPUB file.
 */
export interface ReaderSource extends SyncedBook {
    readonly localId: number
    currChars: number
    currParagraph: number

    bookmarks: Bookmark[]
    nav: NavigationItem[]
    images: SourceImage[]
    sections: Section[]

    /**
     * Returns the section index for a given paragraphId.
     */
    findSectionIndex(paragraphId: number): number | null | undefined

    /**
     * Returns the section index for a given paragrah id.
     */
    findSectionIndexById(id: string): number | null | undefined

    /**
     * Returns all images associated with the source.
     */
    getImages(): SourceImage[]

    getCover(): SourceImage

    /**
     * Returns the CSS style element for the source.
     */
    getCssStyle(): HTMLStyleElement

    /**
     * Saves the current state to the database.
     */
    save(): Promise<void>

    /**
     * Cleans up saved data (e.g., URL blobs).
     */
    deinit(): void
}

/**
 * Represents a section of the source.
 */
export type Section = {
    name: string
    lastIndex: number
    content: string
}

/**
 * Represents a bookmark in the source.
 */
export type Bookmark = {
    /**
     * Paragraph index for the bookmark.
     */
    readonly paragraphId: number

    /**
     * Paragraph index for the bookmark.
     */
    readonly sectionName: string

    /**
     * Content of the bookmark.
     */
    readonly content: string
}

/**
 * Represents a navigation item (e.g., chapter or section).
 */
export type NavigationItem = {
    /**
     * Display text for the navigation item.
     */
    text: string

    /**
     * Should be a valid Section.id.
     */
    id?: string

    /**
     * Optional file reference for the navigation item.
     */
    file?: string
}

export type SourceImage = {
    filename: string
    blob: Blob
    url?: string
}
