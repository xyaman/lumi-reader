import { useAuthContext } from "@/context/session"
import api, { PartialUser } from "@/lib/api"
import { createEffect, createResource, createSignal, For, Show } from "solid-js"
import consumer from "@/services/websocket"
import { snakeToCamel, timeAgo } from "@/lib/utils"

export default function SocialList() {
    const { sessionStore } = useAuthContext()

    const [follows, { mutate: setFollowers }] = createResource(async () => {
        if (!sessionStore.user) return []

        const res = await api.fetchUserFollows(sessionStore.user!.id)
        const { results } = await api.fetchUserStatusBatch(res.following.map((u) => u.id))

        const mapB = new Map(results.map((u) => [u.id, u]))
        return res.following.map((u) => ({ ...u, ...(mapB.get(u.id) || {}) }))
    })

    const channel = consumer.subscriptions.create(
        { channel: "UserPresenceChannel" },
        {
            connected() {
                console.log("websocket connected")
                startHeartbeat()
            },
            disconnected() {
                console.log("websocket disconnected")
                stopHeartbeatInterval()
            },
            received(data: PartialUser) {
                let camelData = snakeToCamel(data)
                setFollowers(
                    (prev) =>
                        prev &&
                        prev.map((u) => ({ ...u, ...(camelData.id === u.id ? camelData : {}) })),
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

    const formatActivity = (kind?: string, name?: string) => {
        if (!kind || !name) return ""

        if (kind === "reading") {
            return `Reading ${name}`
        }

        return name
    }

    return (
        <div class="space-y-3">
            <For each={follows() || []}>
                {(user) => (
                    <div class="flex items-start">
                        <Show
                            when={user.avatarUrl}
                            fallback={
                                <div class="bg-(--base01) w-8 h-8 rounded-full flex items-center">
                                    <span class="text-xs font-medium">
                                        {user.username.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            }
                        >
                            <img
                                src={user.avatarUrl}
                                class="w-8 h-8 rounded-full mt-1 object-cover"
                                alt="User avatar"
                            />
                        </Show>
                        <div class="flex-1 ml-2 min-w-0">
                            <p class="text-sm">{user.username}</p>
                            <p class="text-sm truncate">
                                {formatActivity(user.activityType, user.activityName)}
                            </p>
                            <p class="text-xs text-base04 mt-1">{timeAgo(user.timestamp)}</p>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
