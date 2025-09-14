import { ApiClient } from "@/lib/apiClient"
import { GroupedReadingSession, type ApiReadingSession } from "@/types/api"
import { camelToSnake, snakeToCamel } from "@/lib/utils"
import { ok } from "@/lib/result"
import { LumiDb } from "@/db"
import { lsReadingSessions } from "@/services/localStorage"

type IndexOptions = {
    offset?: number
    limit?: number
    group?: boolean
    start_date?: string
    end_date?: string
    username?: string
}

type SyncOptions = {
    autoManage?: boolean
    lastSnowflake?: number
    localSnowflakes?: number[]
    lastSync?: Date
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

    async sync(options: SyncOptions) {
        // 1. read local sessions snowflakes if argument not present
        const lastSync = options.lastSync || new Date(lsReadingSessions.lastSyncTime())

        const localSnowflakes =
            options.localSnowflakes ||
            ((await LumiDb.readingSessions
                .toCollection()
                .filter((s) => s.createdAt > lastSync)
                .primaryKeys()) as number[])

        const body = {
            device_snowflakes: localSnowflakes,
            updated_since: lastSync,
            last_snowflake: options.lastSnowflake,
        }

        // 2. fetch data from the backend
        const res = await ApiClient.request<ApiReadingSession[]>("/reading_sessions/sync", {
            method: "POST",
            body: JSON.stringify(body),
        })

        // 3. Update last sync if auto-managed
        if (options.autoManage && res.ok) {
            lsReadingSessions.setLastSyncTime(new Date().toISOString())
        }

        return res
    },

    async create(sessions: ApiReadingSession[]) {
        return ApiClient.request<{ snowflake: number; status: string; error?: string[] }[]>("/reading_sessions", {
            method: "POST",
            body: JSON.stringify({ sessions: camelToSnake(sessions) }),
        })
    },

    async destroy(snowflake: number) {
        return ApiClient.request<number>(`/reading_sessions/${snowflake}`, {
            method: "DELETE",
        })
    },
}
