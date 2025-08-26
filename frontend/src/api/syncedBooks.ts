import { ApiClient } from "@/lib/apiClient"
import { ReaderSourceData } from "@/lib/db"
import { AsyncResult, ok } from "@/lib/result"
import { camelToSnake } from "@/lib/utils"
import { deflate, inflate } from "pako"

export type SyncedBook = {
    kind: string
    uniqueId: string
    title: string
    creator: string
    language: string
    totalChars: number
    currChars: number
    currParagraph: number
    createdAt: number
    updatedAt: number
    compressedDataUrl?: string | null
}

export const syncedBooksApi = {
    async getAll() {
        return ApiClient.request<{ books: SyncedBook[] }>("/synced_books")
    },

    async update(uniqueId: string, book: Partial<SyncedBook>) {
        return ApiClient.request<{ book: SyncedBook }>(`/synced_books/${uniqueId}`, {
            method: "PATCH",
            body: JSON.stringify(camelToSnake(book)),
        })
    },

    async sync(books: SyncedBook[]) {
        return ApiClient.request<{ newBooks: SyncedBook[]; updatedBooks: SyncedBook[] }>("/synced_books/sync", {
            method: "POST",
            body: JSON.stringify({ books: camelToSnake(books) }),
        })
    },

    async uploadData(uniqueId: string, data: ReaderSourceData) {
        const imagesWithBase64 = await Promise.all(
            data.images.map(async (img) => {
                const base64 = await blobToBase64(img.blob)
                return { ...img, data: base64 }
            }),
        )

        const dataToCompress = {
            ...data,
            images: imagesWithBase64,
        }

        const compressedData = deflate(JSON.stringify(dataToCompress))
        const formData = new FormData()
        formData.append("compressed_data", new Blob([compressedData]))
        return ApiClient.request<{ url: string }>(`/synced_books/upload/${uniqueId}`, {
            method: "POST",
            body: formData,
        })
    },

    async fetchData(compressedDataUrl: string): AsyncResult<ReaderSourceData, Error> {
        const res = await ApiClient.rawRequest(compressedDataUrl)
        if (res.error) return res

        const arrayBuffer = await res.ok.arrayBuffer()
        const decompressedJson = inflate(new Uint8Array(arrayBuffer), { to: "string" })
        const data = JSON.parse(decompressedJson) as ReaderSourceData

        const imagesWithBlobs = data.images.map((img) => ({
            ...img,
            // @ts-ignore
            blob: base64ToBlob(img.data, "image/jpg"),
        }))

        return ok({
            ...data,
            images: imagesWithBlobs,
        } as ReaderSourceData)
    },

    async delete(uniqueId: string) {
        return ApiClient.request<{ result: string }>(`/synced_books/${uniqueId}`, {
            method: "DELETE",
        })
    },
}

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

function base64ToBlob(base64: string, mime: string): Blob {
    const byteString = atob(base64.split(",")[1])
    const byteArray = Uint8Array.from(byteString, (c) => c.charCodeAt(0))
    return new Blob([byteArray], { type: mime })
}
