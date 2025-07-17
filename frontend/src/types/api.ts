export interface ApiResponse<T = any> {
    success: boolean
    status: string
    data?: T
    errors: Array<string>
}

export interface WebsocketMessage<T = any> {
    type: string
    data: T
}

export interface Presence {
    status?: "online" | "offline"
    activityName?: string
    activityType?: string
    activityTimestamp?: number // unix timestamp
}

export interface User {
    id: number
    username: string
    description: string
    avatarUrl?: string
    followingCount?: number
    followersCount?: number
    shareStatus?: boolean
    presence?: Presence
}

export interface ReadingSession {
    snowflake: number
    userId?: number | null
    bookId: string
    bookTitle: string
    bookLanguage: string
    startTime: number
    endTime?: number | null
    totalReadingTime: number

    // TODO: status
    status?: "active" | "finished"
    updatedAt?: number | null
}
