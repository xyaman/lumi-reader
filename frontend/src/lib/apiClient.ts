import { ApiResponse } from "@/types/api"
import { AsyncResult, err, ok, Result } from "@/lib/result"
import { snakeToCamel } from "@/lib/utils"

const API_URL = import.meta.env.PROD ? "https://api.lumireader.app" : "http://localhost:3000"
const API_VERSION = "v1"

export class ApiError extends Error {
    constructor(
        public response: ApiResponse,
        public status: number,
    ) {
        super(response.errors?.[0] || "[API] An error occurred")
        this.name = "ApiError"
    }
}

export class ConnectionError extends Error {
    constructor(public message: string) {
        super(message)
        this.name = "ConnectionError"
    }
}

export type ApiResult<T> = AsyncResult<ApiResponse<T>, ApiError | ConnectionError>

export class ApiClient {
    static async rawRequest(url: string, options: RequestInit = {}): AsyncResult<Response, ApiError | ConnectionError> {
        let csrfToken

        // All requests methods, except GET, needs the csrfToken. Even for not
        // unprotected routes. The backend puts this cookie on every request
        if (!options.method || options.method !== "GET") {
            try {
                csrfToken = await this.getCsrfToken()
                if (!csrfToken) {
                    return err(new ConnectionError("Missing CSRF token"))
                }
            } catch (e: any) {
                return err(new ConnectionError(e?.message || "Network Error"))
            }
        }

        const isFormData = options.body instanceof FormData

        let response
        try {
            response = await fetch(url, {
                ...options,
                credentials: "include",
                headers: {
                    ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
                    ...(isFormData ? {} : { "Content-Type": "application/json" }),
                    ...options.headers,
                },
            })
        } catch (e: any) {
            return err(new ConnectionError(e?.message || "Network Error"))
        }

        return ok(response)
    }

    static async request<T>(endpoint: string, options: RequestInit = {}): ApiResult<T> {
        const url = `${API_URL}/${API_VERSION}${endpoint}`
        const rawResponse = await this.rawRequest(url, options)
        if (rawResponse.error) return rawResponse

        const response = rawResponse.ok

        let data
        try {
            data = await response.json()
        } catch {
            return err(new ApiError({ errors: ["Invalid JSON response"] } as ApiResponse, response.status))
        }

        if (!response.ok) {
            return err(new ApiError(data, response.status))
        }

        return ok(snakeToCamel(data) as ApiResponse<T>)
    }

    static async requestWithProgress<T>(
        endpoint: string,
        options: RequestInit = {},
        onProgress?: (progress: { type: "upload" | "download"; percent: number }) => void,
        responseType: "json" | "blob" = "json",
    ): Promise<Result<ApiResponse<T> | Blob, Error>> {
        let url
        if (endpoint.startsWith("http")) {
            url = endpoint
        } else {
            url = `${API_URL}/${API_VERSION}${endpoint}`
        }

        return new Promise<Result<ApiResponse<T> | Blob, Error>>(async (resolve) => {
            let csrfToken: string | null = null

            if (!options.method || options.method !== "GET") {
                try {
                    csrfToken = await this.getCsrfToken()
                    if (!csrfToken) {
                        resolve(err(new ConnectionError("Missing CSRF token")))
                        return
                    }
                } catch (e: any) {
                    resolve(err(new ConnectionError(e?.message || "Network Error")))
                    return
                }
            }

            const xhr = new XMLHttpRequest()
            xhr.open(options.method || "GET", url, true)
            xhr.withCredentials = true
            xhr.responseType = responseType

            // headers
            if (csrfToken) xhr.setRequestHeader("X-CSRF-TOKEN", csrfToken)
            if (!(options.body instanceof FormData)) {
                xhr.setRequestHeader("Content-Type", "application/json")
            }

            if (options.headers) {
                for (const [key, value] of Object.entries(options.headers)) {
                    xhr.setRequestHeader(key, value as string)
                }
            }

            // progress events
            if (xhr.upload && onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100)
                        onProgress({ type: "upload", percent })
                    }
                }
            }

            if (onProgress) {
                xhr.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100)
                        onProgress({ type: "download", percent })
                    }
                }
            }

            xhr.onload = () => {
                if (xhr.status < 200 || xhr.status >= 300) {
                    resolve(err(new ApiError(xhr.response, xhr.status)))
                    return
                }

                if (responseType === "blob") {
                    resolve(ok(xhr.response as Blob))
                } else if (responseType === "json") {
                    let data: any = xhr.response
                    if (!data) {
                        // Fallback for browsers that don't parse JSON automatically
                        // brave idk?
                        try {
                            data = JSON.parse(xhr.responseText)
                        } catch {
                            resolve(err(new ApiError({ errors: ["Invalid JSON response"] } as ApiResponse, xhr.status)))
                            return
                        }
                    }
                    resolve(ok(snakeToCamel(data) as ApiResponse<T>))
                } else {
                    let data: any
                    try {
                        data = JSON.parse(xhr.responseText)
                    } catch {
                        resolve(err(new ApiError({ errors: ["Invalid JSON response"] } as ApiResponse, xhr.status)))
                        return
                    }
                    resolve(ok(snakeToCamel(data) as ApiResponse<T>))
                }
            }

            xhr.onerror = () => {
                resolve(err(new ConnectionError("Network error")))
            }

            xhr.send(options.body as any)
        })
    }

    private static async getCsrfToken(): Promise<string | null> {
        const cookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith("CSRF-TOKEN="))
            ?.split("=")[1]

        if (cookie) return cookie
        {
        }
        await fetch(`${API_URL}/csrf`, { credentials: "include" })
        return (
            document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1] || null
        )
    }
}
