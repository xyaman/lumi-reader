export default class StreamingCompressor {
    /**
     * Compresses data using streaming compression with binary data preservation
     */
    static async compressData<T>(data: T): Promise<Blob> {
        try {
            // Pre-process blobs to binary data before JSON serialization
            const processedData = await this.preprocessBlobs(data)
            const serializedData = JSON.stringify(processedData)

            if ("CompressionStream" in window) {
                return this.compressWithStream(serializedData)
            }

            return this.compressWithPako(serializedData)
        } catch (error) {
            throw new Error(`Compression failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
    }

    /**
     * Decompresses data with automatic format detection
     */
    static async decompressData<T>(compressedBlob: Blob): Promise<T> {
        try {
            let decompressedData: string

            // Auto-detect compression format and decompress
            if ("DecompressionStream" in window) {
                decompressedData = await this.decompressWithStream(compressedBlob)
            } else {
                decompressedData = await this.decompressWithPako(compressedBlob)
            }

            // Parse and restore blobs
            const rawData = JSON.parse(decompressedData)
            const restoredData = await this.restoreBlobs(rawData)

            return restoredData as T
        } catch (error) {
            throw new Error(`Decompression failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
    }

    private static async compressWithStream(jsonString: string): Promise<Blob> {
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(jsonString))

                controller.close()
            },
        })

        const compressionStream = new CompressionStream("gzip")
        const compressedStream = stream.pipeThrough(compressionStream)

        const chunks: Uint8Array[] = []

        const reader = compressedStream.getReader()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
        }

        return new Blob(chunks, { type: "application/octet-stream" })
    }

    private static async compressWithPako(jsonString: string): Promise<Blob> {
        const { deflate } = await import("pako")
        const compressed = deflate(jsonString)
        return new Blob([compressed], { type: "application/octet-stream" })
    }

    private static async decompressWithStream(blob: Blob): Promise<string> {
        const decompressionStream = new DecompressionStream("gzip")
        const stream = blob.stream().pipeThrough(decompressionStream)

        const chunks: Uint8Array[] = []
        const reader = stream.getReader()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const result = new Uint8Array(totalLength)
        let offset = 0

        for (const chunk of chunks) {
            result.set(chunk, offset)

            offset += chunk.length
        }

        return new TextDecoder().decode(result)
    }

    private static async decompressWithPako(blob: Blob): Promise<string> {
        const { inflate } = await import("pako")
        const arrayBuffer = await blob.arrayBuffer()
        return inflate(new Uint8Array(arrayBuffer), { to: "string" })
    }

    private static async preprocessBlobs(data: any): Promise<any> {
        if (data instanceof Blob) {
            const arrayBuffer = await data.arrayBuffer()
            return {
                __type: "Blob",
                arrayBuffer: Array.from(new Uint8Array(arrayBuffer)),
                type: data.type,
                size: data.size,
            }
        }

        if (Array.isArray(data)) {
            return Promise.all(data.map((item) => this.preprocessBlobs(item)))
        }

        if (data && typeof data === "object") {
            const result: any = {}
            for (const [key, value] of Object.entries(data)) {
                result[key] = await this.preprocessBlobs(value)
            }
            return result
        }

        return data
    }

    private static async restoreBlobs(data: any): Promise<any> {
        if (data && typeof data === "object" && data.__type === "Blob") {
            const uint8Array = new Uint8Array(data.arrayBuffer)
            return new Blob([uint8Array], { type: data.type })
        }

        if (Array.isArray(data)) {
            return Promise.all(data.map((item) => this.restoreBlobs(item)))
        }

        if (data && typeof data === "object") {
            const result: any = {}
            for (const [key, value] of Object.entries(data)) {
                result[key] = await this.restoreBlobs(value)
            }
            return result
        }

        return data
    }
}
