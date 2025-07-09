import { createStore } from "solid-js/store"

export interface ISessionUser {
    id: number
    email: string
    username: string
    share_reading_data: boolean
    avatar_url?: string
}

export enum ISessionStatus {
    authenticated,
    unauthenticated,
    offline,
}

export interface ISessionStore {
    user: ISessionUser | null
    status: ISessionStatus
}

const initialState: ISessionStore = {
    user: null,
    status: ISessionStatus.unauthenticated,
}

export const [sessionStore, setSessionStore] = createStore<ISessionStore>(initialState)
