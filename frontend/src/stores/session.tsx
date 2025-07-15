import { type AuthUser } from "@/api/auth"
import { createStore } from "solid-js/store"

export enum ISessionStatus {
    authenticated,
    unauthenticated,
    offline,
}

export interface ISessionStore {
    user: AuthUser | null
    status: ISessionStatus
}

const initialState: ISessionStore = {
    user: null,
    status: ISessionStatus.unauthenticated,
}

export const [sessionStore, setSessionStore] = createStore<ISessionStore>(initialState)
