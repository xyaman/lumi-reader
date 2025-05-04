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

        expect(book.identifier).not.toBeFalsy();
        expect(book.identifier).toBeTypeOf("string");

        expect(book.title).not.toBeFalsy();
        expect(book.title).toBeTypeOf("string");

        expect(book.language).not.toBeFalsy();
        expect(book.language).toBeTypeOf("string");
    }
});
