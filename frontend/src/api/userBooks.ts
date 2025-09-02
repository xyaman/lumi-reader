import { ApiClient } from "@/lib/apiClient"
import { ReaderSourceData } from "@/db"
import { AsyncResult, err, ok } from "@/lib/result"
import { camelToSnake } from "@/lib/utils"
import StreamingCompressor from "@/lib/compressor"

export type ApiUserBook = {
    kind: string
    uniqueId: string
    title: string
    creator: string
    language: string
    totalChars: number
    currChars: number
    currParagraph: number
    createdAt: string
    updatedAt: string
    compressedDataUrl?: string | null
}

export const syncedBooksApi = {
    async getAll() {
        return ApiClient.request<ApiUserBook[]>("/user_books")
    },

    // async update(uniqueId: string, book: Partial<ApiUserBook>) {
    //     return ApiClient.request<ApiUserBook>(`/synced_books/${uniqueId}`, {
    //         method: "PATCH",
    //         body: JSON.stringify(camelToSnake(book)),
    //     })
    // },

    async sync(books: ApiUserBook[]) {
        return ApiClient.request<{ newBooks: ApiUserBook[]; updatedBooks: ApiUserBook[] }>("/user_books/sync", {
            method: "POST",
            body: JSON.stringify({ books: camelToSnake(books) }),
        })
    },

    async uploadData(uniqueId: string, data: ReaderSourceData): AsyncResult<any, Error> {
        try {
            const compressedBlob = await StreamingCompressor.compressData(data)

            const formData = new FormData()
            formData.append("compressed_data", compressedBlob)
            const response = await ApiClient.request<any>(`/user_books/${uniqueId}/upload_data`, {
                method: "POST",
                body: formData,
            })

            if (response.error) return response
            return ok(response.ok.data)
        } catch (error) {
            return err(error instanceof Error ? error : new Error("Upload failed"))
        }
    },

    async fetchData(compressedDataUrl: string): AsyncResult<ReaderSourceData, Error> {
        try {
            const response = await ApiClient.rawRequest(compressedDataUrl)
            if (response.error) return response

            const compressedBlob = await response.ok.blob()
            const decompressedData = await StreamingCompressor.decompressData<ReaderSourceData>(compressedBlob)

            return ok(decompressedData)
        } catch (error) {
            return err(error instanceof Error ? error : new Error("Failed to fetch or decompress data"))
        }
    },

    async delete(uniqueId: string) {
        return ApiClient.request<{ result: string }>(`/user_books/${uniqueId}`, {
            method: "DELETE",
        })
    },
}
