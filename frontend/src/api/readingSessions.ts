import { ApiClient } from "@/lib/apiClient"
import { camelToSnake } from "@/lib/utils"
import { type ApiReadingSession } from "@/types/api"
import { type ReadingSession } from "@/db"

// -- helpers
export function serializeApiReadingSession(session: ReadingSession): ApiReadingSession {
    return {
        snowflake: session.snowflake,
        userId: session.userId ?? null,
        bookId: session.bookId,
        bookTitle: session.bookTitle,
        bookLanguage: session.bookLanguage,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime ? session.endTime.toISOString() : null,
        initialChars: session.initialChars,
        currChars: session.currChars,
        totalReadingTime: session.totalReadingTime,
        updatedAt: session.updatedAt ? session.updatedAt.toISOString() : null,
        // status: session.isPaused ? "finished" : "active", // Uncomment if needed
    }
}

export function deserializeApiReadingSession(apiSession: ApiReadingSession): ReadingSession {
    return {
        snowflake: apiSession.snowflake,
        userId: apiSession.userId ?? null,
        bookId: apiSession.bookId,
        bookTitle: apiSession.bookTitle,
        bookLanguage: apiSession.bookLanguage,
        startTime: new Date(apiSession.startTime),
        endTime: apiSession.endTime ? new Date(apiSession.endTime) : null,
        initialChars: apiSession.initialChars,
        currChars: apiSession.currChars,
        totalReadingTime: apiSession.totalReadingTime,
        updatedAt: apiSession.updatedAt ? new Date(apiSession.updatedAt) : null,
        lastActiveTime: new Date(), // You may want to set this from elsewhere
        isPaused: false, // Default, adjust as needed
    }
}

export type DiffResponse = {
    modifiedSessions: ApiReadingSession[]
    remoteOnlySessions: ApiReadingSession[]
    syncTimestamp: string
}

export type BatchUpdateResponse = {
    results: Array<{
        snowflake: number
        status: "conflict" | "updated" | "created"

        // only present if status == "conflict"
        server_version?: ApiReadingSession
        client_version?: ApiReadingSession
    }>
}

export const readingSessionsApi = {
    async create(session: ReadingSession) {
        const apiReadingSession = serializeApiReadingSession(session)
        return ApiClient.request<ApiReadingSession>("/reading_sessions", {
            method: "POST",
            body: JSON.stringify({ reading_session: camelToSnake(apiReadingSession) }),
        })
    },

    // async getAll() {
    //     return ApiClient.request<ApiReadingSession[]>("/reading_sessions")
    // },

    async getRecent(username: string, page: number = 1) {
        return ApiClient.request<{
            sessions: ApiReadingSession[]
            pagy: { page: number; pages: number }
        }>(`/users/${username}/recent_reading_sessions?page=${page}`)
    },

    async getByDateRange(startDate: number, endDate: number) {
        return ApiClient.request<{ sessions: ApiReadingSession[] }>(
            `/reading_sessions?start_date=${startDate}&end_date=${endDate}`,
        )
    },

    async update(id: number, session: ReadingSession) {
        const apiReadingSession = serializeApiReadingSession(session)
        return ApiClient.request<ApiReadingSession>(`/reading_sessions/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ reading_session: camelToSnake(apiReadingSession) }),
        })
    },

    async delete(id: number) {
        return ApiClient.request<{ message: string }>(`/reading_sessions/${id}`, {
            method: "DELETE",
        })
    },

    async index(lastSyncTime: string, localSessionsIds: number[]) {
        const params = new URLSearchParams()
        params.append("last_sync_time", lastSyncTime)
        params.append("local_sessions_ids", localSessionsIds.join(","))
        return ApiClient.request<DiffResponse>(`/reading_sessions?${params.toString()}`)
    },

    async batchUpdate(sessions: ReadingSession[]) {
        const apiReadingSessions = sessions.map(serializeApiReadingSession)
        return ApiClient.request<BatchUpdateResponse>(`/reading_sessions/batch_update`, {
            method: "PUT",
            body: JSON.stringify({ sessions: camelToSnake(apiReadingSessions) }),
        })
    },
}
