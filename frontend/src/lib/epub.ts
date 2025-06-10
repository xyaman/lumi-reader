import JSZip from "jszip"
import { XMLParser } from "fast-xml-parser"
import { Parser } from "htmlparser2"
import { IDBPDatabase, openDB } from "idb"

import { assert, parseCss } from "@/lib/utils"

interface IEpubMetadata {
    identifier: string
    title: string
    language: string
    creator: string[]
    date?: string
}

interface IBookmark {
    paragraphId: number
    content: string
}

interface IEpubManifest {
    /**
     * Table of contents.
     */
    nav: { href?: string; text: string }[]

    /**
     * Xhtml (xml) contents (does not include navigation)
     */
    xhtml: { lastIndex: number; content: string }[]

    /**
     * Imgs of the book.
     * The first index corresponds to the cover
     */
    imgs: { filename: string; blob: Blob }[]

    /**
     * Sanitized css book style. Should be inserted into a style tag to use it.
     */
    css: string
}

interface IEpubBookRecord {
    /**
     * (DB) Local id, epub identifier is in `metadata.identifier`
     */
    id: number

    /**
     * (DB) Timestamp for tracking changes (server and client)
     */
    lastModified?: number
    currParagraphId: number
    bookmarks: IBookmark[]

    /**
     * Book total chars estimation
     */
    totalChars: number
    currChars: number

    /**
     * Books metadata, does not follow exactly epub reference.
     */
    metadata: IEpubMetadata

    manifest: IEpubManifest
}

/**
 * Represents a epub book, this class can't be saved directly into indexedDB,
 * check `EpubBookDB`.
 */
export class EpubBook implements IEpubBookRecord {
    private static dbPromise: Promise<IDBPDatabase> | null = null

    // Database-related properties
    id!: number
    lastModified?: number
    currParagraphId!: number
    totalChars = 0
    currChars = 0
    bookmarks: IBookmark[] = []

    // IEpubBookRecord
    metadata!: IEpubMetadata
    manifest!: IEpubManifest

    /**
     * Helper method to serialize an EpubBook instance for database storage.
     */
    toRecord(): Record<string, any> {
        const record: Partial<IEpubBookRecord> = {
            lastModified: Date.now(),
            metadata: this.metadata,
            manifest: this.manifest,
            currParagraphId: this.currParagraphId,
            totalChars: this.totalChars,
            currChars: this.currChars,
            bookmarks: this.bookmarks,
        }

        if (this.id) record.id = this.id

        return record
    }

    /**
     * Helper method to deserialize a database record into an EpubBook instance.
     */
    static fromRecord(record: IEpubBookRecord): EpubBook {
        const book = new EpubBook()
        book.id = record.id
        book.lastModified = record.lastModified
        book.metadata = record.metadata
        book.manifest = record.manifest
        book.currParagraphId = record.currParagraphId ?? 0
        book.totalChars = record.totalChars
        book.currChars = record.currChars
        book.bookmarks = record.bookmarks
        return book
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
    static async deleteById(id: number): Promise<void> {
        const db = await EpubBook.getDB()
        await db.delete("epubBooks", id)
    }

    /**
     * Saves the current instance to the database.
     */
    async save(): Promise<number> {
        const db = await EpubBook.getDB()
        const record = this.toRecord()
        const newId = (await db.put("epubBooks", record)) as number

        // https://web.dev/articles/persistent-storage
        // @ts-ignore (some browser *may* not support this function)
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persisted()
            console.log(`Persisted storage granted: ${isPersisted}`)
        }

        if (!this.id) this.id = newId
        return newId
    }

    /**
     * Adds/Remove a new bookmark, if the bookmark is already present it will be removed
     * @param id -
     * @param content -
     * @returns boolean true if value was present/removed, false otherwise
     */
    toggleBookmark(id: number | string, content: string): boolean {
        const idNum = Number(id)
        const idx = this.bookmarks.findIndex((b) => b.paragraphId === idNum)
        if (idx !== -1) {
            this.bookmarks.splice(idx, 1)
            return true
        } else {
            this.bookmarks.push({ paragraphId: idNum, content })
            return false
        }
    }

    /**
     * Deletes the current instance from the database.
     */
    async delete(): Promise<void> {}

    static async fromFile(file: File): Promise<EpubBook> {
        const starttime = Date.now()
        const zip = new JSZip()
        await zip.loadAsync(file)

        const book = new EpubBook()
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

        let basePath = ""
        const idx = opfFilename.lastIndexOf("/")
        if (idx > -1) {
            basePath = opfFilename.slice(0, idx)
        }
        book.metadata = extractMetadata(pkgDocumentXml)
        const [manifest, totalChars] = await extractManifest(zip, pkgDocumentXml, basePath)
        book.manifest = manifest
        book.totalChars = totalChars

        console.log(`Epub loaded in ${Date.now() - starttime}ms`)

        await book.save()
        return book
    }

    /**
     * @param element - The element where the epub will be rendered
     * @returns The images blob urls, the caller needs to free/revoke the urls
     */
    public renderContent(element: HTMLElement, options: { xhtml: number | "all" }) {
        const starttime = Date.now()

        if (options.xhtml == "all") {
            let body = ""
            for (const xhtml of this.manifest.xhtml) {
                body += xhtml.content
            }
            element.innerHTML = body
        }

        const blobs: Record<string, string> = {}
        for (let i = 0; i < this.manifest.imgs.length; i++) {
            const imgFilename = getBaseName(this.manifest.imgs[i].filename)!
            const url = URL.createObjectURL(this.manifest.imgs[i].blob)
            blobs[imgFilename] = url
        }

        // Update all <img>, <svg image>, and <image> tags with correct URLs
        const updateImageSrc = (el: Element, attr: string) => {
            const val = el.getAttribute(attr)
            if (!val) return
            const base = getBaseName(val)
            if (base && blobs[base]) el.setAttribute(attr, blobs[base])
        }

        // <img src="">
        element.querySelectorAll("img[src]").forEach((el) => updateImageSrc(el, "src"))
        // <image xlink:href="">
        element.querySelectorAll("image").forEach((el) => updateImageSrc(el, "xlink:href"))

        console.log(`Epub rendered in ${Date.now() - starttime}ms`)
        return Object.values(blobs)
    }

    /**
     * The callers needs to remove the css from the header after unmount.
     * The style imported has the id = "temp-css"
     * */
    public async insertCss() {
        const starttime = Date.now()

        const style = document.createElement("style")
        style.id = "temp-css"
        style.textContent = this.manifest.css
        document.head.append(style)

        console.log(`Css injected in ${Date.now() - starttime}ms`)
    }
}

function getBaseName(path: string) {
    const match = path.match(/(?:.*\/)?([^\/]+\.(?:png|jpe?g|svg|xhtml))$/i)
    return match ? match[1] : path
}

/**
 * Extracts the metadata from the Package Document <metadata> tag.
 * @param pkgDocumentXml - Epub Package Document parsed with fast-xml-parser
 * @throws
 * @returns IEpubMetadata
 */
function extractMetadata(pkgDocumentXml: any) {
    const metadata: IEpubMetadata = {
        identifier: "",
        title: "",
        language: "",
        creator: [],
        date: undefined,
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

async function extractManifest(
    zip: JSZip,
    pkgDocumentXml: any,
    basePath?: string,
): Promise<[IEpubManifest, number]> {
    const items = pkgDocumentXml.package?.manifest?.item
    if (!items || !Array.isArray(items)) {
        throw new Error("Package Document Item(s) not found. Not a valid epub file.")
    }

    let totalChars = 0
    const manifest: IEpubManifest = {
        nav: [],
        xhtml: [],
        imgs: [],
        css: "",
    }

    let navHref = ""
    const xhtmlHref: string[] = []
    const imgsHref: string[] = []
    const cssHref: string[] = []

    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item || typeof item !== "object") continue

        const type = item["@_media-type"]
        const href = item["@_href"]

        if (!type || !href) continue

        if (type === "application/xhtml+xml") {
            if (item["@_properties"] === "nav") {
                navHref = href
                continue
            }
            xhtmlHref.push(href)
        } else if (type === "image/jpeg" || type === "image/png" || type === "image/svg+xml") {
            if ((item["@_id"] as string).includes("cover")) {
                imgsHref.splice(0, 0, href)
                continue
            }
            imgsHref.push(href)
        } else if (type === "text/css") {
            cssHref.push(href)
        }
    }

    const [navContent, xhtmlContent, cssContent, imgs] = await Promise.all([
        zip.file(getFilePath(basePath, navHref))?.async("text"),
        Promise.all(
            xhtmlHref.map((xhtml) => zip.file(getFilePath(basePath, xhtml))?.async("text")!),
        ),
        Promise.all(cssHref.map((css) => zip.file(getFilePath(basePath, css))?.async("text")!)),
        Promise.all(imgsHref.map((img) => zip.file(getFilePath(basePath, img))?.async("blob")!)),
    ])

    // paragraphs + character counts
    let currId = 0
    for (const [i, c] of xhtmlContent.entries()) {
        const [content, id, charsCount] = parseBodyContent(
            getFilePath(basePath, xhtmlHref[i]),
            c,
            currId,
            totalChars,
        )
        currId = id
        totalChars = charsCount
        manifest.xhtml.push({ lastIndex: id, content })
    }

    // TOC (Navigator)
    manifest.nav = navContent ? parseNavigator(navContent) : []

    // Css
    for (const css of cssContent) {
        manifest.css += parseCss(css).join("\n")
    }

    for (let i = 0; i < imgs.length; i++) {
        manifest.imgs.push({ filename: imgsHref[i], blob: imgs[i] })
    }

    return [manifest, totalChars]
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

// https://www.w3.org/TR/epub-33/#sec-nav-def-model
function parseNavigator(navContent: string) {
    const starttime = Date.now()
    const nav = navContent

    let insideNav = false
    let insideLi = false
    const items: Array<{ text: string; href?: string }> = []

    const parser = new Parser({
        onopentag(name, attribs) {
            if (name === "nav" && attribs.hasOwnProperty("epub:type")) {
                insideNav = true
                return
            }
            if (!insideNav) return

            if (name === "li") {
                insideLi = true
                return
            }

            if (insideLi && name === "a") {
                items.push({ href: attribs.href, text: "none" })
            }

            if (insideLi && name === "span") {
                items.push({ text: "none" })
                return
            }
        },

        onclosetag(name) {
            if (name === "nav") {
                insideNav = false
                return
            }

            if (!insideNav) return
            if (name === "li") insideLi = false
        },

        ontext(text) {
            if (!insideLi || text.trim() === "") return
            items[items.length - 1].text = text
        },
    })

    parser.write(nav)
    parser.end()
    console.log(`Navigator parsed in ${Date.now() - starttime}ms`)

    return items
}

function parseBodyContent(
    filename: string,
    xhtml: string,
    initialId: number,
    initialChars: number,
): [string, number, number] {
    let id = initialId
    let insideBody = false
    let insideP = 0
    let insideRt = 0
    const content: string[] = []
    let charsCount = initialChars

    const parser = new Parser({
        onopentag(name, attribs) {
            if (name === "body") {
                insideBody = true
                return
            }

            if (!insideBody) return

            if (name === "p") {
                insideP++
                attribs.index = id.toString()
                attribs.charAcumm = charsCount.toString()
                id++
            }
            if (name === "rt") insideRt++

            const attrs = Object.entries(attribs)
                .map(([k, v]) => `${k}="${v}"`)
                .join(" ")

            content.push(attrs ? `<${name} ${attrs}>` : `<${name}>`)
        },

        onclosetag(name) {
            if (name === "body") {
                insideBody = false
                return
            }

            if (!insideBody) return

            if (name === "p") insideP = Math.max(insideP - 1, 0)
            if (name === "rt") insideRt = Math.max(insideRt - 1, 0)

            content.push(`</${name}>`)
        },

        ontext(text) {
            if (!insideBody) return
            content.push(text)

            // Count only if inside <p> and NOT inside <rt>
            if (insideP > 0 && insideRt === 0) {
                charsCount += getJapaneseCharacterCount(text)
            }
        },
    })

    content.push(`<div id="${getBaseName(filename)}">`)
    parser.write(xhtml)
    parser.end()
    content.push("</div>")

    return [content.join(""), id, charsCount]
}

function getFilePath(basePath: string = "", fn: string): string {
    return basePath ? `${basePath}/${fn}` : fn
}
