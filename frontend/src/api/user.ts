import { ApiClient } from "@/lib/apiClient"
import { camelToSnake } from "@/lib/utils"
import { type User } from "@/types/api"

export const userApi = {
    async getProfile(username: string) {
        return ApiClient.request<User>(`/users/${username}`)
    },

    async getFollowing(username: string, page = 1) {
        return ApiClient.request<{ users: User[]; pagy: { page: number; pages: number; count: number } }>(
            `/users/${username}/following?page=${page}`,
        )
    },

    async getFollowers(username: string, page = 1) {
        return ApiClient.request<{ users: User[]; pagy: { page: number; pages: number; count: number } }>(
            `/users/${username}/followers?page=${page}`,
        )
    },

    async getFollowingPresence(username: string) {
        return ApiClient.request<User[]>(`/users/${username}/following_presence`)
    },

    async searchUsers(query: string) {
        return ApiClient.request<User[]>(`/users?query=${encodeURIComponent(query)}`)
    },

    // Needs auth
    async follow(username: string) {
        return ApiClient.request(`/users/${username}/follow`, { method: "PUT" })
    },

    // Needs auth
    async unfollow(username: string) {
        return ApiClient.request(`/users/${username}/unfollow`, { method: "PUT" })
    },

    // Needs auth
    async updateAvatar(file: File) {
        const formData = new FormData()
        formData.append("avatar", file)

        return ApiClient.request<string>("/me/avatar", {
            method: "PUT",
            body: formData,
        })
    },

    // Needs auth
    async update(payload: Partial<User>) {
        return ApiClient.request("/me", {
            method: "PUT",
            body: JSON.stringify(camelToSnake({ user: payload })),
        })
    },

    async setUserPresence(activityType: string, activityName: string) {
        return ApiClient.request("/me/presence", {
            method: "PUT",
            body: JSON.stringify({
                presence: {
                    activity_name: activityName,
                    activity_type: activityType,
                },
            }),
        })
    },
}
