import { ApiClient } from "@/lib/apiClient"
import { type ReadingSession } from "@/types/api"

export const readingSessionsApi = {
    async create(session: Partial<ReadingSession>) {
        return ApiClient.request<ReadingSession>("/reading_sessions", {
            method: "POST",
            body: JSON.stringify({ reading_session: session }),
        })
    },

    async getAll() {
        return ApiClient.request<{ sessions: ReadingSession[] }>("/reading_sessions")
    },

    async getByDateRange(startDate: number, endDate: number) {
        return ApiClient.request<{ sessions: ReadingSession[] }>(
            `/reading_sessions?start_date=${startDate}&end_date=${endDate}`,
        )
    },

    async update(id: number, session: Partial<ReadingSession>) {
        return ApiClient.request<ReadingSession>(`/reading_sessions/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ reading_session: session }),
        })
    },

    async delete(id: number) {
        return ApiClient.request<{ message: string }>(`/reading_sessions/${id}`, {
            method: "DELETE",
        })
    },

    async getMetadata() {
        return ApiClient.request<{ lastUpdate: number }>("/reading_sessions/metadata")
    },
}
