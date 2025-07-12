import { useAuthContext } from "@/context/session"
import api, { PartialUser } from "@/lib/api"
import { createEffect, createResource, createSignal, For, Show } from "solid-js"
import consumer from "@/services/websocket"
import { timeAgo } from "@/lib/utils"

export default function SocialList() {
    const { sessionStore } = useAuthContext()

    const [viewportFollowings, setViewportFollowings] = createSignal<PartialUser[]>()
    const [follows, { mutate: setFollowers }] = createResource(async () => {
        if (!sessionStore.user) return []

        const res = await api.fetchUserFollows(sessionStore.user!.id)
        setViewportFollowings(res.following)
        const { results } = await api.fetchUserStatusBatch(res.following.map((u) => u.id))

        const mapB = new Map(results.map((u) => [u.id, u]))
        return res.following.map((u) => ({ ...u, ...(mapB.get(u.id) || {}) }))
    })

    const channel = consumer.subscriptions.create(
        { channel: "UserStatusChannel" },
        {
            connected() {
                console.log("websocket connected")
                startHeartbeat()
                updateFilter()
            },
            disconnected() {
                console.log("websocket disconnected")
                stopHeartbeatInterval()
            },
            received(data: PartialUser) {
                setFollowers(
                    (prev) =>
                        prev && prev.map((u) => ({ ...u, ...(data.id === u.id ? data : {}) })),
                )
            },
        },
    )

    let heartbeatInterval: number | null = null
    const startHeartbeat = () => {
        heartbeatInterval = setInterval(() => {
            channel.perform("heartbeat", {})
        }, 30000)
    }

    const stopHeartbeatInterval = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval)
    }

    const updateFilter = () => {
        const users = viewportFollowings()
        if (!users) return
        console.log("updating filter")
        channel.perform("update_filter", { user_ids: users.map((u) => u.id) })
    }

    createEffect(() => {
        // TODO: se triggea 2 veces
        updateFilter()
    })

    return (
        <div class="space-y-3">
            <For each={follows() || []}>
                {(user) => (
                    <div class="flex items-start">
                        <Show
                            when={user.avatar_url}
                            fallback={
                                <div class="bg-(--base01) w-8 h-8 rounded-full flex items-center">
                                    <span class="text-xs font-medium">
                                        {user.username.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            }
                        >
                            <img
                                src={user.avatar_url}
                                class="w-8 h-8 rounded-full mt-1 object-cover"
                                alt="User avatar"
                            />
                        </Show>
                        <div class="flex-1 ml-2 min-w-0">
                            <p class="text-sm">{user.username}</p>
                            <p class="text-sm truncate">{user.last_activity}</p>
                            <p class="text-xs text-base04 mt-1">{timeAgo(user.timestamp)}</p>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
