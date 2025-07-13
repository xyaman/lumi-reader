const LS_AUTOSTART = "reader:sessions:autostart"
const LS_AUTOSYNC = "reader:sessions:autosync"
const LS_LASTSYNC = "last_session_sync_time"

function getNumberOr(key: string, fallback: number | string) {
    return Number(localStorage.getItem(key) || fallback)
}

function getOrTrue(key: string) {
    const item = localStorage.getItem(key)
    return item !== null ? item === "true" : true
}

function set(key: string, value: unknown) {
    if (typeof value === "string") {
        localStorage.setItem(key, value)
    } else {
        localStorage.setItem(key, String(value))
    }
}

export const lsReadingSessions = {
    autoStart: () => getOrTrue(LS_AUTOSTART),
    autoSync: () => getOrTrue(LS_AUTOSYNC),
    setAutoStart: (value: unknown) => set(LS_AUTOSTART, value),
    setAutoSync: (value: unknown) => set(LS_AUTOSYNC, value),
    lastSyncTime: () => getNumberOr(LS_LASTSYNC, 0),
    setLastSyncTime: (value: number) => set(LS_LASTSYNC, value),
}
