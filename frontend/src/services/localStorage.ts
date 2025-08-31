import { type AuthUser } from "@/api/auth"

// -- reader settings
const LS_FONT_SIZE = "reader:fontSize"
const LS_LINE_HEIGHT = "reader:lineHeight"
const LS_VERTICAL_PADDING = "reader:verticalPadding"
const LS_HORIZONTAL_PADDING = "reader:horizontalPadding"
const LS_SHOW_FURIGANA = "reader:showFurigana"
const LS_VERTICAL = "reader:vertical"
const LS_PAGINATED = "reader:paginated"

// reading sessions
const LS_LASTSYNC = "last_session_sync_time"
const LS_AUTOSTART = "reader:sessions:autostart"
const LS_AUTOSYNC = "reader:sessions:autosync"

// auth
const LS_CURRUSER = "auth:currentuser"

function getNumberOr(key: string, fallback: number | string) {
    return Number(localStorage.getItem(key) || fallback)
}

function getOrTrue(key: string) {
    const item = localStorage.getItem(key)
    return item !== null ? item === "true" : true
}

function getStringOr(key: string, or: string) {
    const item = localStorage.getItem(key)
    return item || or
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

export const lsReader = {
    fontSize: () => getNumberOr(LS_FONT_SIZE, 16),
    setFontSize: (value: number) => set(LS_FONT_SIZE, value),

    lineHeight: () => getNumberOr(LS_LINE_HEIGHT, 1.5),
    setLineHeight: (value: number) => set(LS_LINE_HEIGHT, value),

    verticalPadding: () => getNumberOr(LS_VERTICAL_PADDING, 24),
    setVerticalPadding: (value: number) => set(LS_VERTICAL_PADDING, value),

    horizontalPadding: () => getNumberOr(LS_HORIZONTAL_PADDING, 24),
    setHorizontalPadding: (value: number) => set(LS_HORIZONTAL_PADDING, value),

    showFurigana: () => getOrTrue(LS_SHOW_FURIGANA),
    setShowFurigana: (value: boolean) => set(LS_SHOW_FURIGANA, value),

    vertical: () => getOrTrue(LS_VERTICAL),
    setVertical: (value: boolean) => set(LS_VERTICAL, value),

    paginated: () => getOrTrue(LS_PAGINATED),
    setPaginated: (value: boolean) => set(LS_PAGINATED, value),
}

export const lsReadingSessions = {
    autoStart: () => getOrTrue(LS_AUTOSTART),
    autoSync: () => getOrTrue(LS_AUTOSYNC),
    setAutoStart: (value: unknown) => set(LS_AUTOSTART, value),
    setAutoSync: (value: unknown) => set(LS_AUTOSYNC, value),
    lastSyncTime: () => getStringOr(LS_LASTSYNC, new Date().toISOString()),
    setLastSyncTime: (value: string) => set(LS_LASTSYNC, value),
}

export const lsAuth = {
    currentUser: () => get<AuthUser | undefined>(LS_CURRUSER),
    setCurrentUser: (user: AuthUser) => set(LS_CURRUSER, user),
    removeCurrentUser: () => remove(LS_CURRUSER),
}
