import { For, Show, createResource } from "solid-js"
import { useAuthContext } from "@/context/auth"
import api from "@/lib/api"
import { timeAgo } from "@/lib/utils"
import { A } from "@solidjs/router"

interface UserStatus {
    last_activity?: string
    timestamp?: string
}
export default function FollowingActivitySidebar() {
    const { authStore } = useAuthContext()
    const user = () => authStore.user

    const [followings] = createResource(user, async (currUser) => {
        if (!currUser) return []
        const res = await api.fetchUserFollows(currUser.id)
        const followingList = res.following

        const userIds = followingList.map((f: any) => f.id)
        let statusBatch: Record<string, UserStatus> = {}

        if (userIds.length > 0) {
            const statusRes = await api.fetchUserStatusBatch(userIds)
            statusBatch = Object.fromEntries(
                statusRes.results.map((s: any) => [
                    s.user_id,
                    {
                        last_activity: s.last_activity,
                        timestamp: timeAgo(s.timestamp),
                    },
                ]),
            )
        }

        return followingList.map((f: any) => ({
            ...f,
            status: statusBatch[f.id] || undefined,
        }))
    })

    return (
        <aside class="navbar-theme hidden md:flex border-l p-4 flex-col w-48 lg:w-64 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            <Show
                when={!followings.loading}
                fallback={
                    <div class="flex-1 flex items-center justify-center">
                        <p class="text-sm text-gray-500">Loading...</p>
                    </div>
                }
            >
                <div id="followings-scroll" class="overflow-y-auto flex-1 space-y-3">
                    <For
                        each={followings() || []}
                        fallback={<p class="text-sm text-center mt-4">No followings found</p>}
                    >
                        {(following) => (
                            <div class="bg-(--base00) hover:bg-(--base02) p-2 rounded-md text-sm">
                                <A href={`/users/${following.id}`}>
                                    <div class="flex items-center space-x-2">
                                        <Show
                                            when={following.avatar_url}
                                            fallback={
                                                <div class="bg-(--base01) w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <span class="text-xs font-medium">
                                                        {following.username.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            }
                                        >
                                            <img
                                                src={following.avatar_url}
                                                alt={`${following.username}'s avatar`}
                                                class="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                        </Show>
                                        <div class="min-w-0 flex-1">
                                            <p class="font-medium truncate">{following.username}</p>
                                            <Show
                                                when={
                                                    following.status &&
                                                    (following.status.last_activity ||
                                                        following.status.timestamp)
                                                }
                                            >
                                                <div class="text-xs mt-1">
                                                    <Show when={following.status?.last_activity}>
                                                        <div class="truncate">
                                                            Reading:{" "}
                                                            {following.status!.last_activity}
                                                        </div>
                                                    </Show>
                                                    <Show when={following.status?.timestamp}>
                                                        <div>{following.status!.timestamp}</div>
                                                    </Show>
                                                </div>
                                            </Show>
                                            <Show
                                                when={
                                                    !following.status ||
                                                    (!following.status.last_activity &&
                                                        !following.status.timestamp)
                                                }
                                            >
                                                <div class="text-xs mt-1 italic">
                                                    No recent activity
                                                </div>
                                            </Show>
                                        </div>
                                    </div>
                                </A>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </aside>
    )
}
