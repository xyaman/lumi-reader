import { ApiClient } from "@/lib/apiClient"
import { GroupedReadingSession, type ApiReadingSession } from "@/types/api"
import { camelToSnake, snakeToCamel } from "@/lib/utils"
import { ok } from "@/lib/result"

type IndexOptions = {
    offset?: number
    limit?: number
    group?: boolean
    start_date?: string
    end_date?: string
    username?: string
}

export const readingSessionsApi = {
    async index(options?: IndexOptions) {
        const params = new URLSearchParams()

        options = {
            group: false,
            limit: 50,
            offset: 0,
            ...options,
        }

        params.append("offset", options.offset!.toString())
        params.append("limit", options.limit!.toString())
        params.append("group", options.group ? "true" : "false")

        if (options.username) params.append("username", options.username.toString())
        if (options?.start_date) params.append("start_date", options.start_date)
        if (options?.end_date) params.append("end_date", options.end_date)

        const queryString = params.toString()
        const url = `/reading_sessions?${queryString}`

        // TODO: find a more clean way
        // map groups to reading sessions on the frontend

        const res = await ApiClient.request<ApiReadingSession[]>(url)
        if (res.ok && options.group) {
            const groups = snakeToCamel(res.ok.data) as GroupedReadingSession[]
            return ok({
                data: groups.map((s) => ({
                    snowflake: s.lastSnowflake,
                    bookId: s.bookId,
                    bookTitle: s.bookTitle,
                    bookLanguage: s.bookLanguage,
                    charsRead: s.totalCharsRead,
                    timeSpent: s.totalTimeSpent,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                })) as ApiReadingSession[],
            })
        }

        return res
    },

    async create(sessions: ApiReadingSession[]) {
        return ApiClient.request<{ snowflake: number; status: string; error?: string[] }[]>("/reading_sessions", {
            method: "POST",
            body: JSON.stringify({ sessions: camelToSnake(sessions) }),
        })
    },
}
