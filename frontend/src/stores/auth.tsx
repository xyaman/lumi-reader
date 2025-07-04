import { createStore } from "solid-js/store"

export interface IAuthUser {
    id: number
    email: string
    username: string
    share_reading_data: boolean
    avatar?: Blob
    avatar_url: string
}

export enum UserStatus {
    authenticated,
    unauthenticated,
    offline,
}

export interface IAuthStore {
    user: IAuthUser | null
    status: UserStatus
}

function getInitialSettings(): IAuthStore {
    return {
        user: null,
        status: UserStatus.unauthenticated,
    }
}

export const [authStore, setAuthStore] = createStore<IAuthStore>(getInitialSettings())
