import { ApiClient } from "@/lib/apiClient"
import { ReaderSourceData } from "@/db"
import { err, ok } from "@/lib/result"
import { camelToSnake } from "@/lib/utils"
import StreamingCompressor from "@/lib/compressor"
import { ApiResponse } from "@/types/api"

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

    // TODO: save bookmakrs as json? dont save them in the compressed file
    async upload(
        bookData: ApiUserBook,
        data: ReaderSourceData,
        onProgress: (progress: { type: "upload" | "download"; percent: number }) => void,
    ) {
        try {
            const compressedBlob = await StreamingCompressor.compressData(data)
            const formData = new FormData()
            formData.append("user_book[kind]", bookData.kind)
            formData.append("user_book[unique_id]", bookData.uniqueId)
            formData.append("user_book[title]", bookData.title)
            formData.append("user_book[creator]", bookData.creator)
            formData.append("user_book[language]", bookData.language)
            formData.append("user_book[total_chars]", String(bookData.totalChars))
            formData.append("user_book[curr_chars]", String(bookData.currChars))
            formData.append("user_book[curr_paragraph]", String(bookData.currParagraph))
            formData.append("user_book[updated_at]", bookData.updatedAt)
            formData.append("user_book[compressed_data]", compressedBlob)

            const response = await ApiClient.requestWithProgress<ApiUserBook>(
                "/user_books",
                {
                    method: "POST",
                    body: formData,
                },
                onProgress,
            )

            if (response.error) return response
            return ok((response.ok as ApiResponse<ApiUserBook>).data)
        } catch (error) {
            return err(error instanceof Error ? error : new Error("Upload failed."))
        }
    },

    async download(
        compressedDataUrl: string,
        onProgress: (progress: { type: "upload" | "download"; percent: number }) => void,
    ) {
        try {
            const response = await ApiClient.requestWithProgress<Blob>(
                compressedDataUrl,
                { method: "GET" },
                onProgress,
                "blob",
            )
            if (response.error) return response
            const compressedBlob = response.ok as Blob
            const decompressedData = await StreamingCompressor.decompressData<ReaderSourceData>(compressedBlob)
            return ok(decompressedData)
        } catch (error) {
            return err(error instanceof Error ? error : new Error("Failed to fetch or decompress data"))
        }
    },

    async sync(userBook: ApiUserBook) {
        return ApiClient.request<ApiUserBook | null>("/user_books/sync", {
            method: "PUT",
            body: JSON.stringify(camelToSnake({ userBook })),
        })
    },

    async delete(uniqueId: string) {
        return ApiClient.request<{ result: string }>(`/user_books/${uniqueId}`, {
            method: "DELETE",
        })
    },
}
