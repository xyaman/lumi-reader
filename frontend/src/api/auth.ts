import { ApiClient } from "@/lib/apiClient"
import { type User } from "@/types/api"

export type AuthUser = User & {
    email: string
}

// TODO: endpoints
export const authApi = {
    // Login and creates a session for the user
    // The session is saved as a httponly cookie
    async login(credentials: { email: string; password: string }) {
        return ApiClient.request<{ user: AuthUser }>("/session", {
            method: "POST",
            body: JSON.stringify(credentials),
        })
    },

    // Registers a new user with the given credentials
    async register(credentials: {
        email: string
        username: string
        password: string
        password_confirmation: string
    }) {
        return ApiClient.request<{ user: AuthUser }>("/session", {
            method: "POST",
            body: JSON.stringify({ user: credentials }),
        })
    },

    async getCurrentUser() {
        return ApiClient.request<{ user: AuthUser }>("/session", { method: "GET" })
    },

    // Logouts and invalidates the session
    async logout() {
        return ApiClient.request<void>("/session", { method: "DELETE" })
    },
}
