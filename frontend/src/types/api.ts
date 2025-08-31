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

export interface PatreonTier {
    id: number
    patreonTierId: string
    name: string
    ammountCents: number
    description: string | null
    imageUrl: string | null
    published: boolean
}

export interface User {
    id: number
    username: string
    bio: string
    avatarUrl?: string
    followingCount?: number
    followersCount?: number
    patreonTier: PatreonTier | null
    shareOnlineStatus: boolean
    sharePresence: boolean
    // present if the user is logged in
    following?: boolean

    presence?: Presence
}

export interface ApiReadingSession {
    snowflake: number
    userId?: number | null
    bookId: string
    bookTitle: string
    bookLanguage: string
    startTime: string
    endTime?: string | null
    initialChars: number
    currChars: number
    totalReadingTime: number

    // TODO: status
    // status?: "active" | "finished"
    updatedAt?: string | null
}
