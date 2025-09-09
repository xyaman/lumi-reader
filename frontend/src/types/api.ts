export interface ApiResponse<T = any> {
    status: string
    data: T
    message?: string
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

export interface Tier {
    id: number
    patreonTierId: string
    name: string
    amountCents: number
    description: string | null
    imageUrl: string | null
    published: boolean
    bookSyncLimit: number
}

export interface ReadingStats {
    totalBooks: number
    totalReadingHours: number
}

export interface User {
    id: number
    username: string
    bio: string
    avatarUrl?: string
    followingCount?: number
    followersCount?: number
    tier: Tier
    shareOnlineStatus: boolean
    sharePresence: boolean
    stats: ReadingStats
    presence?: Presence

    // present if the user is logged in
    isFollowing?: boolean
}

export interface ApiReadingSession {
    snowflake: number
    userId?: number // set during sync
    bookId: string
    bookTitle: string
    bookLanguage: string
    charsRead: number
    timeSpent: number
    createdAt: string
    updatedAt: string
}

export interface GroupedReadingSession {
    lastSnowflake: number
    userId?: number
    bookId: string
    bookTitle: string
    bookLanguage: string
    totalCharsRead: number
    totalTimeSpent: number
}
