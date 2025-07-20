import { ApiClient } from "@/lib/apiClient"
import { camelToSnake } from "@/lib/utils"
import { type ReadingSession } from "@/types/api"

export type DiffResponse = {
    modifiedSessions: ReadingSession[]
    remoteOnlySessions: ReadingSession[]
    syncTimestamp: number
}

export type BatchUpdateResponse = {
    results: Array<{
        snowflake: number
        status: "conflict" | "updated" | "created"

        // only present if status == "conflict"
        server_version?: ReadingSession
        client_version?: ReadingSession
    }>
}

export const readingSessionsApi = {
    async create(session: Partial<ReadingSession>) {
        return ApiClient.request<ReadingSession>("/reading_sessions", {
            method: "POST",
            body: JSON.stringify({ reading_session: camelToSnake(session) }),
        })
    },

    async getAll() {
        return ApiClient.request<{ sessions: ReadingSession[] }>("/reading_sessions")
    },

    async getRecent(userId: number, page: number = 1) {
        return ApiClient.request<{
            sessions: ReadingSession[]
            pagy: { page: number; pages: number }
        }>(`/reading_sessions/recent/${userId}?page=${page}`)
    },

    async getByDateRange(startDate: number, endDate: number) {
        return ApiClient.request<{ sessions: ReadingSession[] }>(
            `/reading_sessions?start_date=${startDate}&end_date=${endDate}`,
        )
    },

    async update(id: number, session: Partial<ReadingSession>) {
        return ApiClient.request<ReadingSession>(`/reading_sessions/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ reading_session: camelToSnake(session) }),
        })
    },

    async delete(id: number) {
        return ApiClient.request<{ message: string }>(`/reading_sessions/${id}`, {
            method: "DELETE",
        })
    },

    async diff(lastSyncTime: number, localSessionsIds: number[]) {
        const params = new URLSearchParams()
        params.append("last_sync_time", String(lastSyncTime))
        localSessionsIds.forEach((id) => params.append("local_session_ids[]", String(id)))

        return ApiClient.request<DiffResponse>(`/reading_sessions/diff?${params.toString()}`)
    },

    async batchUpdate(sessions: ReadingSession[]) {
        return ApiClient.request<BatchUpdateResponse>(`/reading_sessions/batch_update`, {
            method: "POST",
            body: JSON.stringify({ sessions: camelToSnake(sessions) }),
        })
    },
}
