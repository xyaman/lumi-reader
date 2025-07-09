import { createContext, useContext, JSX, createEffect } from "solid-js"
import {
    sessionStore,
    setSessionStore,
    ISessionStatus,
    ISessionUser,
    ISessionStore,
} from "@/stores/session"
import api from "@/lib/api"

const AUTH_STORE_KEY = "auth:userinfo"

interface ISessionContext {
    sessionStore: ISessionStore

    // local
    startSession: () => Promise<void>
    closeSession: () => void

    // helpers (api)
    fetchCurrentUser: () => Promise<void>
    updateCurrentStatus: (status: string) => Promise<void>
}
const AuthContext = createContext<ISessionContext>()

async function updateCurrentStatus(status: string) {
    if (navigator.onLine && sessionStore.status === ISessionStatus.authenticated) {
        await api.updateCurrentUserStatus(status)
    }
}

/**
 * Fetches the current authenticated user from the API.
 * Updates the authStore based on the response or network status.
 */
async function fetchCurrentUser() {
    if (!navigator.onLine) {
        setSessionStore("status", ISessionStatus.offline)
        return
    }

    try {
        const res = await api.fetchSessionInfo()
        if (res) {
            const user: ISessionUser = {
                id: res.user.id,
                email: res.user.email,
                username: res.user.username,
                share_reading_data: res.user.share_status,
                avatar_url: res.user.avatar_url,
            }
            setSessionStore({ user, status: ISessionStatus.authenticated })
        } else {
            setSessionStore({ user: null, status: ISessionStatus.unauthenticated })
        }
    } catch {
        setSessionStore("status", ISessionStatus.offline)
    }
}

/**
 * Provides authentication context to child components.
 * Handles periodic user fetching and online/offline events.
 * @param props.children - Child components to render within the provider
 */
export function AuthProvider(props: { children: JSX.Element }) {
    let interval: number | undefined

    function setupInterval() {
        if (interval) clearInterval(interval)
        interval = setInterval(
            () => {
                if (navigator.onLine) fetchCurrentUser()
            },
            5 * 60 * 1000,
        )
    }

    const startSession = async () => {
        await fetchCurrentUser()
        window.addEventListener("online", fetchCurrentUser)
        window.addEventListener("online", setupInterval)
        window.addEventListener("offline", () => setSessionStore("status", ISessionStatus.offline))
    }

    const closeSession = async () => {
        setSessionStore({ user: null, status: ISessionStatus.unauthenticated })
        localStorage.removeItem(AUTH_STORE_KEY)

        if (interval) clearInterval(interval)
        window.removeEventListener("online", fetchCurrentUser)
        window.removeEventListener("online", setupInterval)
        window.removeEventListener("offline", () =>
            setSessionStore("status", ISessionStatus.offline),
        )
    }

    // Sync authStore to localStorage on change
    // The session is removed in `closeSession` when user is null
    createEffect(() => {
        if (sessionStore.user) localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(sessionStore))
    })

    // Hydrate authStore from localStorage
    const stored = localStorage.getItem(AUTH_STORE_KEY)
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            setSessionStore(parsed)
            startSession().then(() => console.log("Session started"))
        } catch {}
    }

    return (
        <AuthContext.Provider
            value={{
                sessionStore: sessionStore,
                fetchCurrentUser,
                updateCurrentStatus,
                startSession,
                closeSession,
            }}
        >
            {props.children}
        </AuthContext.Provider>
    )
}

/**
 * Custom hook to access the authentication context.
 * Throws if used outside of an AuthProvider.
 * @returns The current authentication store
 */
export function useAuthContext() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useReaderContext must be used inside <ReaderProvider>")
    return ctx
}
