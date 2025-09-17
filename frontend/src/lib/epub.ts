import JSZip from "jszip"
import { Bookmark, SourceImage, NavigationItem, ReaderSource, Section } from "./readerSource"
import { XMLParser } from "fast-xml-parser"
import { Parser } from "htmlparser2"
import { assert, parseCss } from "./utils"
import { LumiDb, ReaderSourceRecord } from "../db"

interface IEpubMetadata {
    identifier: string
    title: string
    language: string
    creator: string[]
    date?: string
}

interface IEpubManifest {
    /**
     * Table of contents.
     */
    nav: NavigationItem[]

    /**
     * Xhtml (xml) contents (does not include navigation)
     */
    xhtml: { lastIndex: number; id: string; content: string; name: string }[]

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

type IEpubSpine = string[]

export class EpubBook implements ReaderSource {
    kind: string = "epub"

    localId!: number
    uniqueId!: string
    createdAt: string = new Date().toISOString()
    updatedAt: string = new Date().toISOString()
    title!: string
    language!: string
    creator!: string
    totalChars!: number
    currChars: number = 0
    currParagraph: number = 0

    bookmarks: Bookmark[] = []
    nav: NavigationItem[] = []
    sections: Section[] = []
    css: string = ""
    images: SourceImage[] = []

    // Create EpubBook from ReaderSourceRecord
    static fromReaderSourceRecord(record: ReaderSourceRecord): EpubBook {
        const book = new EpubBook()
        book.localId = record.localId
        book.uniqueId = record.uniqueId
        book.createdAt = record.createdAt
        book.updatedAt = record.updatedAt
        book.title = record.title
        book.language = record.language
        book.creator = record.creator
        book.totalChars = record.totalChars
        book.currChars = record.currChars
        book.currParagraph = record.currParagraph
        book.kind = "epub"

        book.bookmarks = record.bookmarks
        book.nav = record.nav
        book.sections = record.sections
        book.css = record.css
        book.images = record.images.map((img) => ({
            ...img,
            url: URL.createObjectURL(img.blob),
        }))

        return book
    }

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
        const metadata = extractMetadata(pkgDocumentXml)
        book.title = metadata.title
        book.creator = metadata.creator.join(" ")
        book.language = metadata.language
        book.uniqueId = metadata.identifier

        const [manifest, totalChars] = await extractManifest(zip, pkgDocumentXml, book.language, basePath)
        book.totalChars = totalChars
        book.nav = manifest.nav
        book.sections = manifest.xhtml
        book.css = manifest.css
        book.images = manifest.imgs.map((img) => ({
            ...img,
            url: URL.createObjectURL(img.blob),
        }))

        console.log(`Epub loaded in ${Date.now() - starttime}ms`)
        await book.save()
        return book
    }

    findSectionIndex(paragraphId: number): number | null | undefined {
        for (let i = 0; i < this.sections.length; i++) {
            if (paragraphId <= this.sections[i].lastIndex) {
                return i
            }
        }

        return null
    }

    findSectionIndexById(name: string): number | null | undefined {
        for (let i = 0; i < this.sections.length; i++) {
            if (name === this.sections[i].name) {
                return i
            }
        }

        return null
    }

    getImages(): SourceImage[] {
        return this.images
    }

    getCover(): SourceImage {
        return this.images[0]
    }

    getCssStyle(): HTMLStyleElement {
        const style = document.createElement("style")
        style.textContent = this.css
        return style
    }

    toReaderSourceRecord(): Partial<ReaderSourceRecord> {
        // toReaderSourceRecord(): ReaderSourceRecord {
        return {
            kind: "epub",
            uniqueId: this.uniqueId,
            title: this.title,
            creator: this.creator,
            updatedAt: this.updatedAt,
            createdAt: this.createdAt,
            language: this.language,
            totalChars: this.totalChars,
            currChars: this.currChars,
            currParagraph: this.currParagraph,
            bookmarks: this.bookmarks,
            nav: this.nav,
            css: this.css,
            sections: this.sections,
            images: this.images,
        }
    }

    async save(): Promise<void> {
        const record = this.toReaderSourceRecord() as ReaderSourceRecord
        if (this.localId) record.localId = this.localId
        await LumiDb.saveBookRecord(record)

        // Update localId if it was assigned by IndexedDB
        if (record.localId != null) this.localId = record.localId
    }

    deinit(): void {
        for (const img of this.images) {
            if (img.url) {
                URL.revokeObjectURL(img.url)
            }
        }
    }
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

    metadata.identifier = String(extractId(ids))

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
    lang: string,
    basePath: string,
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
    const xhtmlIds: string[] = []
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
            xhtmlIds.push(item["@_id"])
        } else if (type === "image/jpeg" || type === "image/png" || type === "image/svg+xml") {
            if ((item["@_id"] as string).includes("cover") || (item["@_properties"] as string)?.includes("cover")) {
                imgsHref.splice(0, 0, href)
                continue
            }
            imgsHref.push(href)
        } else if (type === "text/css") {
            cssHref.push(href)
        }
    }
    let xhtmlFiles = xhtmlIds.map((id, i) => ({ id, href: xhtmlHref[i] }))
    const spineOrder = extractSpine(pkgDocumentXml)
    if (spineOrder) {
        xhtmlFiles = spineOrder.map((id) => xhtmlFiles.find((x) => x.id === id)).filter(Boolean) as {
            id: string
            href: string
        }[]
    }

    const [navContent, xhtmlContent, cssContent, imgs] = await Promise.all([
        zip.file(getFilePath(basePath, navHref))?.async("text"),
        Promise.all(xhtmlFiles.map((f) => zip.file(getFilePath(basePath, f.href))?.async("text")!)),
        Promise.all(cssHref.map((css) => zip.file(getFilePath(basePath, css))?.async("text")!)),
        Promise.all(imgsHref.map((img) => zip.file(getFilePath(basePath, img))?.async("blob")!)),
    ])

    // TOC (Navigator)
    manifest.nav = navContent ? parseNavigator(navContent) : []

    // paragraphs + character counts
    let currId = 0
    for (const [i, c] of xhtmlContent.entries()) {
        const realFilePath = getFilePath(basePath, xhtmlFiles[i].href)
        const [content, id, charsCount] = parseBodyContent(realFilePath, c, currId, totalChars, lang)
        currId = id
        totalChars = charsCount
        manifest.xhtml.push({
            lastIndex: id - 1,
            id: xhtmlFiles[i].id,
            content,
            name: getBaseName(realFilePath),
        })
    }

    // Css
    for (const css of cssContent) {
        manifest.css += parseCss(css).join("\n")
    }

    for (let i = 0; i < imgs.length; i++) {
        manifest.imgs.push({ filename: imgsHref[i], blob: imgs[i] })
    }

    return [manifest, totalChars]
}

function extractSpine(pkgDocumentXml: any): IEpubSpine {
    const items = pkgDocumentXml.package?.spine?.itemref
    if (!items || !Array.isArray(items)) {
        throw new Error("Package Document Item(s) not found. Not a valid epub file.")
    }

    const itemref = []
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item || typeof item !== "object") continue
        if (item["@_idref"]) itemref.push(item["@_idref"])
    }

    return itemref
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

// Count Japanese characters (Hiragana, Katakana, Kanji)
function getJapaneseCharacterCount(text: string): number {
    if (!text) return 0
    const japaneseRegex = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー々〻]/gu
    const matches = text.match(japaneseRegex)
    return matches ? matches.length : 0
}

// Count all characters except symbols/punctuation
function getTextCharacterCount(text: string): number {
    if (!text) return 0
    // \p{L} = letters, \p{N} = numbers, \p{Zs} = space separators
    const textRegex = /[\p{L}\p{N}\p{Zs}]+/gu
    const matches = text.match(textRegex)
    if (!matches) return 0
    return matches.reduce((sum, m) => sum + [...m].length, 0)
}

// Dispatcher based on language
function getCharacterCountByLanguage(text: string, lang: string): number {
    switch (lang) {
        case "ja":
            return getJapaneseCharacterCount(text)
        default:
            return getTextCharacterCount(text)
    }
}

// https://www.w3.org/TR/epub-33/#sec-nav-def-model
function parseNavigator(navContent: string): NavigationItem[] {
    const starttime = Date.now()
    const nav = navContent

    let insideNav = false
    let insideLi = false
    const items: NavigationItem[] = []

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
                const [filepath, id] = attribs.href.split("#")
                const current: { text: string; file?: string; id?: string } = {
                    file: getBaseName(filepath),
                    text: "none",
                }

                if (id) current.id = id
                items.push(current)
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
    lang: string,
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

            if (name === "img" || name === "image") {
                attribs.index = id.toString()
                attribs.charAcumm = charsCount.toString()
                id++
            }

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
                charsCount += getCharacterCountByLanguage(text, lang)
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

function getBaseName(path: string) {
    const match = path.match(/(?:.*\/)?([^\/]+\.(?:png|jpe?g|svg|xhtml|html))$/i)
    return match ? match[1] : path
}
