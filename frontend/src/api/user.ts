import { ApiClient } from "@/lib/apiClient"
import { type User } from "@/types/api"

export const userApi = {
    async getProfile(userId: number) {
        return ApiClient.request<{ user: User }>(`/users/${userId}`)
    },

    async getFollowing(userId: number, includePresence = false) {
        const params = includePresence ? "?presence=1" : ""
        return ApiClient.request<{ following: User[] }>(`/users/${userId}/following${params}`)
    },

    async getFollowers(userId: number, includePresence = false) {
        const params = includePresence ? "?presence=1" : ""
        return ApiClient.request<{ followers: User[] }>(`/users/${userId}/followers${params}`)
    },

    async searchUsers(query: string) {
        return ApiClient.request<{ users: User[] }>(`/users/search?q=${encodeURIComponent(query)}`)
    },

    // Needs auth
    async follow(userId: number) {
        return ApiClient.request(`/session/follows/${userId}`, { method: "PUT" })
    },

    // Needs auth
    async unfollow(userId: number) {
        return ApiClient.request(`/session/follows/${userId}`, { method: "DELETE" })
    },

    // Needs auth
    async updateAvatar(file: File) {
        const formData = new FormData()
        formData.append("avatar", file)

        return ApiClient.request<{ avatarUrl: string }>("/session/avatar", {
            method: "PATCH",
            body: formData,
        })
    },

    // Needs auth
    async updateDescription(description: string) {
        return ApiClient.request("/session/description", {
            method: "PATCH",
            body: JSON.stringify({ description }),
        })
    },

    // Needs auth
    async updateShareStatus(status: boolean) {
        return ApiClient.request("/session/share_status", {
            method: "PATCH",
            body: JSON.stringify({ share_status: status }),
        })
    },

    async setUserPresence(activityType: string, activityName: string) {
        return ApiClient.request("/session/presence", {
            method: "PATCH",
            body: JSON.stringify({
                activity_name: activityName,
                activity_type: activityType,
            }),
        })
    },
}
