import { type AuthUser } from "@/api/auth"

// reader
const LS_AUTOSTART = "reader:sessions:autostart"
const LS_AUTOSYNC = "reader:sessions:autosync"

// reading sessions
const LS_LASTSYNC = "last_session_sync_time"

// auth
const LS_CURRUSER = "auth:currentuser"

function getNumberOr(key: string, fallback: number | string) {
    return Number(localStorage.getItem(key) || fallback)
}

function getOrTrue(key: string) {
    const item = localStorage.getItem(key)
    return item !== null ? item === "true" : true
}

function set(key: string, value: unknown) {
    if (typeof value === "object" && value != null) {
        localStorage.setItem(key, JSON.stringify(value))
    } else if (typeof value === "string") {
        localStorage.setItem(key, value)
    } else {
        localStorage.setItem(key, String(value))
    }
}

function remove(key: string) {
    localStorage.removeItem(key)
}

// TODO: change T
function get<T>(key: string, json: boolean = true): T | undefined {
    const item = localStorage.getItem(key)
    return json && item ? JSON.parse(item as string) : item
}

export const lsReadingSessions = {
    autoStart: () => getOrTrue(LS_AUTOSTART),
    autoSync: () => getOrTrue(LS_AUTOSYNC),
    setAutoStart: (value: unknown) => set(LS_AUTOSTART, value),
    setAutoSync: (value: unknown) => set(LS_AUTOSYNC, value),
    lastSyncTime: () => getNumberOr(LS_LASTSYNC, 0),
    setLastSyncTime: (value: number) => set(LS_LASTSYNC, value),
}

export const lsAuth = {
    currentUser: () => get<AuthUser | undefined>(LS_CURRUSER),
    setCurrentUser: (user: AuthUser) => set(LS_CURRUSER, user),
    removeCurrentUser: () => remove(LS_CURRUSER),
}
