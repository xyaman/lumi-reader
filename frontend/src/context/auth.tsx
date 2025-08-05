import { authApi, type AuthUser } from "@/api/auth"
import { ApiError, ConnectionError, type ApiResult } from "@/lib/apiClient"
import { lsAuth } from "@/services/localStorage"
import { createContext, JSX, onMount, useContext } from "solid-js"
import { createStore } from "solid-js/store"

type AuthState = {
    user: AuthUser | null
    status: "loading" | "authenticated" | "unauthenticated" | "offline"
    error: string | null
}

type AuthDispatch = {
    login: (credentials: { email: string; password: string }) => ApiResult<{ user: AuthUser }>
    logout: () => ApiResult<void>
}

const AuthStateContext = createContext<AuthState>()
const AuthDispatchContext = createContext<AuthDispatch>()

export default function AuthProvider(props: { children: JSX.Element }) {
    const [store, setStore] = createStore<AuthState>({
        user: null,
        status: "loading",
        error: null,
    })

    onMount(async () => {
        const cachedUser = lsAuth.currentUser()
        if (!cachedUser) return

        const res = await authApi.getCurrentUser()

        if (res.ok) {
            setStore("user", res.ok.data!.user)
            setStore("status", "authenticated")
            return
        }

        if (res.error instanceof ConnectionError) {
            /// no internet, so we used the cached user
            setStore("user", cachedUser)
            setStore("status", "offline")
            setStore("error", res.error.message)
            return
        }

        if (res.error instanceof ApiError) {
            setStore("status", "unauthenticated")
            setStore("error", res.error.message)
        }
    })

    const login = async (credentials: { email: string; password: string }): ApiResult<{ user: AuthUser }> => {
        setStore("error", null)
        const res = await authApi.login(credentials)
        if (res.error) {
            setStore("status", "unauthenticated")
            setStore("error", res.error.message)
            return res
        }

        // TODO: AuthUser type
        const data = res.ok.data!
        setStore("user", data.user)
        setStore("status", "authenticated")
        setStore("error", null)

        lsAuth.setCurrentUser(data.user)

        return res
    }

    const logout = async (): ApiResult<void> => {
        const res = await authApi.logout()
        lsAuth.removeCurrentUser()
        setStore("user", null)
        setStore("status", "unauthenticated")
        setStore("error", null)
        return res
    }

    return (
        <AuthStateContext.Provider value={store}>
            <AuthDispatchContext.Provider value={{ login, logout }}>{props.children}</AuthDispatchContext.Provider>
        </AuthStateContext.Provider>
    )
}

export function useAuthState() {
    const ctx = useContext(AuthStateContext)
    if (!ctx) throw new Error("useAuthState must be used inside <AuthProvider>")
    return ctx
}

export function useAuthDispatch() {
    const ctx = useContext(AuthDispatchContext)
    if (!ctx) throw new Error("AuthDispatchContext must be used inside <AuthProvider>")
    return ctx
}
