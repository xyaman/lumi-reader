import { ApiClient } from "@/lib/apiClient"
import { type User } from "@/types/api"

export type AuthUser = User & {
    email: string
    isPatreonLinked: boolean
    isAdmin: boolean
}

// TODO: endpoints
export const authApi = {
    // Login and creates a session for the user
    // The session is saved as a httponly cookie
    async login(credentials: { email: string; password: string }) {
        return ApiClient.request<AuthUser>("/session", {
            method: "POST",
            body: JSON.stringify({ credentials }),
        })
    },

    // Registers a new user with the given credentials
    async register(credentials: { email: string; username: string; password: string; password_confirmation: string }) {
        return ApiClient.request<AuthUser>("/registration", {
            method: "POST",
            body: JSON.stringify({ user: credentials }),
        })
    },

    async sendResetPasswordMail(email: string) {
        return ApiClient.request<null>("/password_resets", {
            method: "POST",
            body: JSON.stringify({ email }),
        })
    },

    async resetPassword(credentials: { password: string; password_confirmation: string }, token: string) {
        const { password, password_confirmation } = credentials
        return ApiClient.request<null>(`/password_resets/${token}`, {
            method: "PUT",
            body: JSON.stringify({ password_reset: { password, password_confirmation } }),
        })
    },

    async getCurrentUser() {
        return ApiClient.request<AuthUser>("/me", { method: "GET" })
    },

    // Logouts and invalidates the session
    async logout() {
        return ApiClient.request<void>("/session", { method: "DELETE" })
    },

    // oauth
    async generatePatreonUrl() {
        return ApiClient.request<string>("/auth/patreon/generate")
    },

    async unlinkPatreon() {
        return ApiClient.request<string>("/auth/patreon/unlink")
    },

    async refreshPatreon() {
        return ApiClient.request<string>("/auth/patreon/refresh")
    },
}
