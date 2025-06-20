/**
 * Represents a source for the reader, such as an EPUB file.
 */
export interface ReaderSource {
    /**
     * Local database identifier.
     */
    readonly localId: number

    /**
     * Unique identifier for the source (e.g., EPUB unique identifier).
     */
    readonly uniqueId: string

    /**
     * Creation date as a timestamp (milliseconds since epoch).
     */
    readonly creationDate: number

    /**
     * Last modification date as a timestamp (milliseconds since epoch).
     */
    lastModifiedDate: number

    /**
     * Title of the source.
     */
    readonly title: string

    /**
     * Language code (e.g., 'en', 'es').
     */
    readonly language: string

    /**
     * List of creators/authors.
     */
    readonly creator: string[]

    /**
     * Total number of characters in the book.
     */
    readonly totalChars: number

    /**
     * Current character position, depends on currParagraph.
     */
    currChars: number

    /**
     * Current paragraph index.
     */
    currParagraph: number

    /**
     * Returns all content as an array of strings.
     */
    getAllContent(): string[]

    /**
     * Returns the content of a specific section by index.
     * @param index Index of the section.
     * @returns Content string, or null/undefined if not found.
     */
    getContentBySection(index: number): string | null | undefined

    /**
     * Returns all bookmarks.
     */
    getBookmarks(): Bookmark[]

    /**
     * Returns navigation items for the source.
     */
    getNavigation(): NavigationItem[]

    /**
     * Returns all images associated with the source.
     * @remarks Consider returning an array of image URLs or objects instead of void.
     */
    getImages(): void

    /**
     * Returns the CSS style element for the source.
     */
    getCssStyle(): HTMLStyleElement

    /**
     * Saves the current state to the database.
     */
    save(): void

    /**
     * Cleans up saved data (e.g., URL blobs).
     */
    deinit(): void
}

/**
 * Represents a section of the source.
 */
export type Section = {
    /**
     * Should match NavigationItem.id.
     */
    id: string

    /**
     * Index of the last paragraph in the section.
     */
    lastIndex: number

    /**
     * HTML content as a string.
     */
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
    readonly text: string

    /**
     * Should be a valid Section.id.
     */
    readonly id?: string

    /**
     * Optional file reference for the navigation item.
     */
    readonly file?: string
}
