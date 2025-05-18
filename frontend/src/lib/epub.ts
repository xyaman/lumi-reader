import JSZip from "jszip"
import { XMLParser } from "fast-xml-parser"
import { Parser } from "htmlparser2"
import { IDBPDatabase, openDB } from "idb"

import { assert } from "./utils"

/**
 * Represents a epub book, this class can't be saved directly into indexedDB,
 * check `EpubBookDB`.
 */
export class EpubBook {
    // Core properties
    epubFile: File
    metadata!: {
        identifier: string
        title: string
        language: string
        creator: string[]
        date?: string
    }

    // Book content
    charCount: number = 0
    basePath: string = ""
    xhtml: string[] = []
    imgs: string[] = []
    css: string[] = []
    cover!: Blob

    // Database-related properties
    id!: number // Should only be optional before initialization
    lastModified?: number // Optional: Timestamp for tracking changes

    private static dbPromise: Promise<IDBPDatabase> | null = null

    /**
     * Helper method to serialize an EpubBook instance for database storage.
     */
    toRecord(): Record<string, any> {
        const record: Record<string, any> = {
            metadata: this.metadata,
            epubFile: this.epubFile,
            lastModified: this.lastModified ?? Date.now(),
            cover: this.cover,
            xhtml: this.xhtml,
            css: this.css,
            imgs: this.imgs,
            charCount: this.charCount,
            basePath: this.basePath,
            ...(this.id != null && { id: this.id }), // Include `id` only if it is not null/undefined
        }

        return record
    }

    /**
     * Helper method to deserialize a database record into an EpubBook instance.
     */
    static fromRecord(record: Record<string, any>): EpubBook {
        const book = new EpubBook(record.epubFile)
        book.id = record.id
        book.metadata = record.metadata
        book.lastModified = record.lastModified
        book.cover = record.cover
        book.xhtml = record.xhtml
        book.css = record.css
        book.imgs = record.imgs
        book.charCount = record.charCount
        book.basePath = record.basePath
        return book
    }

    private constructor(f: File) {
        this.epubFile = f
    }

    private static getDB(): Promise<IDBPDatabase> {
        if (!EpubBook.dbPromise) {
            EpubBook.dbPromise = openDB("epub-reader-db", 1, {
                upgrade(db) {
                    const store = db.createObjectStore("epubBooks", {
                        keyPath: "id",
                        autoIncrement: true,
                    })
                    store.createIndex("title", "metadata.title")
                    store.createIndex("identifier", "metadata.identifier")
                    store.createIndex("lastModified", "lastModified")
                },
            })
        }
        return EpubBook.dbPromise
    }

    /**
     * Retrieves an EpubBook instance by ID.
     */
    static async getById(id: number): Promise<EpubBook | undefined> {
        const db = await EpubBook.getDB()
        return db.get("epubBooks", id)
    }

    //     async getBookByEpubIdentifier(
    //         id: string,
    //     ): Promise<EpubBookRecord | undefined> {
    //         const db = await this.dbPromise;
    //         return db.getFromIndex("epubBooks", "metadata.identifier", id);
    //     }

    /**
     * Retrieves all EpubBook instances from the database.
     */
    static async getAll(): Promise<EpubBook[]> {
        const db = await EpubBook.getDB()
        const objBooks = await db.getAll("epubBooks")
        return objBooks.map((o) => EpubBook.fromRecord(o))
    }

    /**
     * Deletes an EpubBook instance by ID.
     */
    // static async deleteById(id: number): Promise<void> {
    // }

    /**
     * Saves the current instance to the database.
     */
    async save(): Promise<number> {
        const db = await EpubBook.getDB()
        const record = this.toRecord()
        const newId = (await db.put("epubBooks", record)) as number

        if (!this.id) this.id = newId
        return newId
    }

    /**
     * Deletes the current instance from the database.
     */
    async delete(): Promise<void> {}

    private getFilePath(fn: string): string {
        return this.basePath ? `${this.basePath}/${fn}` : fn
    }

    /** Creates a EpubBook from a file
     * @param file - an .epub file
     * @throws
     * @returns Promise<EpubBook>
     */
    static async fromFile(file: File): Promise<EpubBook> {
        const starttime = Date.now()
        const book = new EpubBook(file)

        const zip = new JSZip()
        await zip.loadAsync(file)

        const parser = new XMLParser({ ignoreAttributes: false })

        // https://www.w3.org/TR/epub-33/#sec-container-metainf
        const container = await zip.file("META-INF/container.xml")?.async("text")
        if (!container) {
            throw new Error("META-INF/container.xml not found. Not valid epub file.")
        }
        const containerXml = parser.parse(container)

        const rootFiles = containerXml.container.rootfiles.rootfile
        const rootFile = Array.isArray(rootFiles) ? rootFiles[0] : rootFiles

        // https://www.w3.org/TR/epub-33/#sec-package-doc
        const opfFilename = rootFile["@_full-path"]
        const pkgDocument = await zip.file(opfFilename)?.async("text")

        if (!pkgDocument) {
            throw new Error("Package Document file (.opf) not found. Not a valid epub file.")
        }
        const pkgDocumentXml = parser.parse(pkgDocument)

        book.metadata = extractMetadata(pkgDocumentXml)

        // read book manifest
        const manifest = extractManifest(pkgDocumentXml, opfFilename)
        book.xhtml = manifest.xhtml
        book.imgs = manifest.imgs
        book.css = manifest.css
        book.basePath = manifest.basePath

        // TODO: undefined
        book.cover = await zip.file(book.getFilePath(manifest.cover!))?.async("blob")!

        // read book spine

        console.log(`Epub loaded in ${Date.now() - starttime}ms`)

        await book.save()
        return book
    }

    public async renderContent(element: HTMLElement) {
        const zip = new JSZip()
        await zip.loadAsync(this.epubFile)

        const [contents, _] = await Promise.all([
            Promise.all(
                this.xhtml.map((xhtml) => zip.file(this.getFilePath(xhtml))?.async("text")!),
            ),
            Promise.all(
                this.imgs.map((xhtml) => zip.file(this.getFilePath(xhtml))?.async("text")!),
            ),
        ])

        let body = ""

        for (const xhtml of contents) {
            const [content, charCount] = extractBodyContent(xhtml)
            body += content
            this.charCount += charCount
        }

        element.innerHTML += body
    }
}

/**
 * Extracts the metadata from the Package Document <metadata> tag.
 * @param pkgDocumentXml - Epub Package Document parsed with fast-xml-parser
 * @throws
 * @returns IEpubMetadata
 */
function extractMetadata(pkgDocumentXml: any) {
    const metadata = {
        identifier: "",
        title: "",
        language: "",
        creator: [],
    }

    // according to the specs, there can be more than one id
    const ids = pkgDocumentXml.package.metadata["dc:identifier"]
    if (!ids) {
        throw new Error("dc:identifier not found. Not a valid epub file.")
    }

    metadata.identifier = extractId(ids)

    const titles = pkgDocumentXml.package.metadata["dc:title"]
    if (!titles) {
        throw new Error("Title(s) not found. Not a valid epub file.")
    }
    metadata.title = extractText(titles)

    const langs = pkgDocumentXml.package.metadata["dc:language"]
    if (!langs) {
        throw new Error("Language(s) not found. Not a valid epub file.")
    }
    metadata.language = extractText(langs)

    let creators = pkgDocumentXml.package.metadata["dc:creator"]
    if (creators) {
        // TODO: create function to parse every property instead
        creators = Array.isArray(creators) ? creators : [creators]
        for (const creator of creators) {
            metadata.creator.push(typeof creator === "string" ? creator : creator["#text"])
        }
    }

    const date = pkgDocumentXml.package.metadata["dc:date"]
    if (date) {
        metadata.date = typeof date === "string" ? date : date["#text"]
    }

    return metadata
}

/**
 * @param pkgDocumentXml -
 * @returns
 */
function extractManifest(pkgDocumentXml: any, opfFilename: string) {
    const items = pkgDocumentXml.package?.manifest?.item
    if (!items || !Array.isArray(items)) {
        throw new Error("Package Document Item(s) not found. Not a valid epub file.")
    }

    const xhtml: string[] = []
    const imgs: string[] = []
    const css: string[] = []
    let cover: string | undefined = undefined

    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item || typeof item !== "object") continue

        const type = item["@_media-type"]
        const href = item["@_href"]

        if (!type || !href) continue

        if (type === "application/xhtml+xml") {
            xhtml.push(href)
        } else if (type === "image/jpeg" || type === "image/png" || type === "image/svg+xml") {
            if ((item["@_id"] as string).includes("cover")) {
                cover = href
                continue
            }

            imgs.push(href)
        } else if (type === "text/css") {
            css.push(href)
        }
    }

    let base = ""
    const idx = opfFilename.lastIndexOf("/")
    if (idx > -1) {
        base = opfFilename.slice(0, idx)
    }

    return { xhtml, imgs, css, basePath: base, cover }
}

/**
 * Helper function to extract text content from an XML element.
 * Handles both string and object cases, including arrays.
 */
function extractText(element: unknown): string {
    if (Array.isArray(element)) {
        return extractText(element[0])
    }

    if (typeof element === "string") {
        return element
    }

    if (typeof element === "object" && element !== null && "#text" in element) {
        return (element as Record<string, string>)["#text"]
    }

    // This should never happen
    assert(false)
}

/**
 * Retrieves the id of the epub book, sometimes the epub have more than one id,
 * this function will prioritize uuid
 * @param element - <dc:identifier> xml array
 * @returns epub identifier
 */
function extractId(element: unknown): string {
    if (typeof element === "string") {
        return element
    }

    // btw (typeof null === "object") -> true
    if (typeof element === "object" && element !== null && "#text" in element) {
        return (element as Record<string, string>)["#text"]
    }

    // this should never happen
    assert(Array.isArray(element), "Invalid identifier format: expected an array.")

    let fallbackId = ""

    for (const node of element as Array<unknown>) {
        if (typeof node === "string") {
            fallbackId = node
            continue
        }

        if (typeof node === "object" && node !== null) {
            if ("@_id" in node && (node as any)["@_id"] === "uuid_id") {
                return extractText(node)
            }

            const text = extractText(node)
            if (text) {
                fallbackId = text
            }
        }
    }

    return fallbackId
}

function getJapaneseCharacterCount(text: string): number {
    if (!text) return 0
    const isNotJapaneseRegex = /[^\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー々〻]+/gu
    const clean = text.replace(isNotJapaneseRegex, "")
    return [...clean].length
}

function extractBodyContent(xhtml: string): [string, number] {
    let insideBody = false
    let insideParagraph = false
    let insideRt = false
    let content = ""
    let charCount = 0

    const parser = new Parser(
        {
            onopentag(name) {
                if (name === "body") {
                    insideBody = true
                    return
                }

                if (name === "p") {
                    insideParagraph = true
                }

                if (name === "rt") {
                    insideRt = true
                }

                if (insideBody) {
                    content += `<${name}>`
                }
            },
            onclosetag(name) {
                if (name === "body") {
                    insideBody = false
                    parser.end()
                    return
                }

                if (name === "p") {
                    insideParagraph = false
                }

                if (name === "rt") {
                    insideRt = false
                }

                if (insideBody) {
                    content += `</${name}>`
                }
            },
            ontext(data) {
                if (insideBody) {
                    content += data

                    if (insideParagraph && !insideRt) {
                        charCount += getJapaneseCharacterCount(data)
                    }
                }
            },
        },
        { decodeEntities: true },
    )

    parser.write(xhtml)
    parser.end()

    return [content, charCount]
}
