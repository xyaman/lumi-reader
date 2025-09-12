import { type AuthUser } from "@/api/auth"

// home page
const LS_RESIZABLE_SIZES = "home:resizableSizes"

// -- reader settings
const LS_FONT_SIZE = "reader:fontSize"
const LS_LINE_HEIGHT = "reader:lineHeight"
const LS_VERTICAL_PADDING = "reader:verticalPadding"
const LS_HORIZONTAL_PADDING = "reader:horizontalPadding"
const LS_SHOW_FURIGANA = "reader:showFurigana"
const LS_VERTICAL = "reader:vertical"
const LS_PAGINATED = "reader:paginated"
const LS_INJECTCSS = "reader:injectCss"

// reading sessions
const LS_LASTSYNC = "reading_sessions:last_sync"
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

function getOrFalse(key: string) {
    const item = localStorage.getItem(key)
    return item !== null ? item === "true" : false
}

function getStringOr(key: string, or: any) {
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
    return json && item ? JSON.parse(item) : item
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

    vertical: () => getOrFalse(LS_VERTICAL),
    setVertical: (value: boolean) => set(LS_VERTICAL, value),

    paginated: () => getOrTrue(LS_PAGINATED),
    setPaginated: (value: boolean) => set(LS_PAGINATED, value),

    disableCssInjection: () => getOrFalse(LS_INJECTCSS),
    setDisableCssInjection: (value: boolean) => set(LS_INJECTCSS, value),
}

export const lsReadingSessions = {
    autoStart: () => getOrTrue(LS_AUTOSTART),
    autoSync: () => getOrTrue(LS_AUTOSYNC),
    setAutoStart: (value: unknown) => set(LS_AUTOSTART, value),
    setAutoSync: (value: unknown) => set(LS_AUTOSYNC, value),
    lastSyncTime: () => getStringOr(LS_LASTSYNC, null),
    setLastSyncTime: (value: string) => set(LS_LASTSYNC, value),
}

export const lsAuth = {
    currentUser: () => get<AuthUser | undefined>(LS_CURRUSER),
    setCurrentUser: (user: AuthUser) => set(LS_CURRUSER, user),
    removeCurrentUser: () => remove(LS_CURRUSER),
}

export const lsHome = {
    resizableSizes: () => get<number[]>(LS_RESIZABLE_SIZES, true) || [0.2, 0.8],
    setResizableSizes: (sizes: number[]) => set(LS_RESIZABLE_SIZES, sizes),
}
