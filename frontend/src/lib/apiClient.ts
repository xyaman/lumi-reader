import { ApiResponse } from "@/types/api"
import { AsyncResult, err, ok } from "@/lib/result"
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
    static async rawRequest(
        url: string,
        options: RequestInit = {},
    ): AsyncResult<Response, ApiError | ConnectionError> {
        // All requests methods, except GET, needs the csrfToken. Even for not
        // unprotected routes. The backend puts this cookie on every request
        const csrfToken = await this.getCsrfToken()
        if (!csrfToken) {
            return err(new ConnectionError("Missing CSRF token"))
        }

        const isFormData = options.body instanceof FormData

        let response
        try {
            response = await fetch(url, {
                ...options,
                credentials: "include",
                headers: {
                    "X-CSRF-TOKEN": csrfToken || "",
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
            return err(
                new ApiError({ errors: ["Invalid JSON response"] } as ApiResponse, response.status),
            )
        }

        if (!response.ok) {
            return err(new ApiError(data, response.status))
        }

        return ok(snakeToCamel(data) as ApiResponse<T>)
    }

    private static async getCsrfToken(): Promise<string | null> {
        const cookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith("CSRF-TOKEN="))
            ?.split("=")[1]

        if (cookie) return cookie

        await fetch(`${API_URL}/csrf`, { credentials: "include" })
        return (
            document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1] || null
        )
    }
}
