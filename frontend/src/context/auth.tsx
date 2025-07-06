import { createContext, useContext, JSX, onCleanup, onMount, createEffect } from "solid-js"
import { authStore, setAuthStore, UserStatus, IAuthUser, IAuthStore } from "@/stores/auth"
import api from "@/lib/api"

const AUTH_STORE_KEY = "auth:userinfo"

interface IAuthContext {
    authStore: IAuthStore
    fetchCurrentUser: () => Promise<void>
    logout: () => void
}
const AuthContext = createContext<IAuthContext>()

/**
 * Fetches the current authenticated user from the API.
 * Updates the authStore based on the response or network status.
 */
async function fetchCurrentUser() {
    if (!navigator.onLine) {
        setAuthStore("status", UserStatus.offline)
        return
    }

    try {
        const res = await api.fetchSessionInfo()
        if (res) {
            const user: IAuthUser = {
                id: res.user.id,
                email: res.user.email,
                username: res.user.username,
                share_reading_data: res.user.share_status,
                avatar_url: "",
            }
            setAuthStore({ user, status: UserStatus.authenticated })
        } else {
            setAuthStore({ user: null, status: UserStatus.unauthenticated })
        }
    } catch {
        setAuthStore("status", UserStatus.offline)
    }
}

function logout() {
    setAuthStore({ user: null, status: UserStatus.unauthenticated })
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

    // Hydrate authStore from localStorage
    const stored = localStorage.getItem(AUTH_STORE_KEY)
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            setAuthStore(parsed)
        } catch {}
    }

    onMount(() => {
        fetchCurrentUser()
        setupInterval()
        window.addEventListener("online", fetchCurrentUser)
        window.addEventListener("online", setupInterval)
        window.addEventListener("offline", () => setAuthStore("status", UserStatus.offline))
    })

    onCleanup(() => {
        if (interval) clearInterval(interval)
        window.removeEventListener("online", fetchCurrentUser)
        window.removeEventListener("online", setupInterval)
        window.removeEventListener("offline", () => setAuthStore("status", UserStatus.offline))
    })

    // Sync authStore to localStorage on change
    createEffect(() => {
        localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(authStore))
    })

    return (
        <AuthContext.Provider value={{ authStore, fetchCurrentUser, logout }}>
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
