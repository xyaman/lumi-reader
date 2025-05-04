import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export class EpubBook {
    epubFile: File

    // https://www.w3.org/TR/epub-33/#sec-file-names-to-path-names

    /// contains an identifier such as a UUID, DOI or ISBN.
    // identifier: string[] = []
    identifier!: string;

    // EPUB creators should use only a single dc:title element to ensure 
    // consistent rendering of the title in reading systems.
    title!: string

    // The value of each dc:language element MUST be a well-formed language tag 
    language: string[] = []

    creator: string[] = []
    date?: string

    private constructor(f: File) {
        this.epubFile = f;
    }

    /** Creates a EpubBook from a file
     * @param file - an .epub file
     * @throws
     * @returns Promise<EpubBook>
     */
    static async fromFile(file: File): Promise<EpubBook> {
        const starttime = Date.now();
        let book = new EpubBook(file);

        const zip = new JSZip();
        await zip.loadAsync(file);

        const parser = new XMLParser({ ignoreAttributes: false });

        // https://www.w3.org/TR/epub-33/#sec-container-metainf
        const container = await zip.file("META-INF/container.xml")?.async("text")
        if (!container) {
            throw new Error("META-INF/container.xml not found. Not valid epub file.");
        }
        const containerXml = parser.parse(container);

        const rootFiles = containerXml.container.rootfiles.rootfile;
        const rootFile = Array.isArray(rootFiles) ? rootFiles[0] : rootFiles;

        // https://www.w3.org/TR/epub-33/#sec-package-doc
        const opfFilename = rootFile["@_full-path"];
        const pkgDocument = await zip.file(opfFilename)?.async("text")

        if (!pkgDocument) {
            throw new Error("Package Document file (.opf) not found. Not a valid epub file.");
        }
        const pkgDocumentXml = parser.parse(pkgDocument);

        let ids = pkgDocumentXml.package.metadata["dc:identifier"];
        if (!ids) {
            throw new Error("Identifier(s) not found. Not a valid epub file.");
        }
        // according to the specs, there can be more than one id
        let id = Array.isArray(ids) ? ids[0] : ids;
        book.identifier = typeof id === "string" ? id : id["#text"];

        let titles = pkgDocumentXml.package.metadata["dc:title"];
        if (!titles) {
            throw new Error("Title(s) not found. Not a valid epub file.");
        }
        let title = Array.isArray(titles) ? titles[0] : titles;
        book.title = typeof title === "string" ? title : title["#text"];

        let langs = pkgDocumentXml.package.metadata["dc:language"];
        if (!langs) {
            throw new Error("Language(s) not found. Not a valid epub file.");
        }
        let language = Array.isArray(langs) ? langs[0] : langs;
        book.language = typeof language === "string" ? language : language["#text"];

        console.log("identifier", book.identifier);
        console.log("title", book.title);
        console.log("language", book.language);

        let creators = pkgDocumentXml.package.metadata["dc:creator"];
        if (creators) {

            // TODO: create function to parse every property instead
            creators = Array.isArray(creators) ? creators : [creators];
            for (const creator of creators) {
                book.creator.push(typeof creator === "string" ? creator : creator["#text"])
            }
            console.log("creators", book.creator);
        }

        let date = pkgDocumentXml.package.metadata["dc:date"];
        if (date) {
            book.date = typeof date === "string" ? date : date["#text"];
            console.log("date", book.date);
        }


        // read book manifest
        console.log(pkgDocumentXml.package.manifest.item);
        console.log(pkgDocument);



        // read book spine
        console.log(`Epub loaded in ${Date.now() - starttime}ms`);
        return book;
    }
}

/* https://www.w3.org/TR/epub-33/#sec-file-names-to-path-names
    To derive the file path, given a file or directory file in the OCF abstract
    container, apply the following steps (expressed using the terminology of [infra]):

    1. Let path be an empty list.
    2. Let current be file.
    3. While current is not the root directory:
        - prepend the file name of current to path;
        - set current to the parent directory of current.
    4.Return the concatenation of path using the U+002F (/) character.
 */
