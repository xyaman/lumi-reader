import { expect, test } from "vitest";
import fs from "node:fs";
import { EpubBook } from "./epub";
import path from "node:path";

test("metadata", async () => {
    const epubsDir = fs.globSync("/home/xyaman/Documents/epubs/*.epub");
    for (const epubFileName of epubsDir) {
        const buffer = fs.readFileSync(epubFileName);
        const file = new File([buffer], path.basename(epubFileName), {
            type: "application/epub+zip",
        });

        const book = await EpubBook.fromFile(file);

        expect(book.metadata.identifier).not.toBeFalsy();
        expect(book.metadata.identifier).toBeTypeOf("string");

        expect(book.metadata.title).not.toBeFalsy();
        expect(book.metadata.title).toBeTypeOf("string");

        expect(book.metadata.language).not.toBeFalsy();
        expect(book.metadata.language).toBeTypeOf("string");
    }
});
