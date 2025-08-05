import { createResource, For } from "solid-js"
import consumer from "@/services/websocket"
import { snakeToCamel, timeAgo } from "@/lib/utils"
import { userApi } from "@/api/user"
import { User } from "@/types/api"
import UserAvatar from "./UserAvatar"
import { useAuthState } from "@/context/auth"

export default function SocialList() {
    const authState = useAuthState()

    const [follows, { mutate: setFollowers }] = createResource(async () => {
        if (!authState.user) return []
        const res = await userApi.getFollowing(authState.user!.id, true)
        if (res.error) throw res.error
        return res.ok.data!.following
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
            received(data: User) {
                const camelData = snakeToCamel(data)
                setFollowers(
                    (prev) =>
                        prev &&
                        prev.map((u) => ({
                            ...u,
                            presence: { ...(camelData.id === u.id ? camelData : {}) },
                        })),
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
                        <div class="relative">
                            {/* Avatar */}
                            <UserAvatar user={user} w={10} h={10} />
                            <div
                                class={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${user.presence?.status === "online" ? "bg-base0B" : "bg-base04"}`}
                            />
                        </div>

                        {/* Presence */}
                        <div class="flex-1 ml-2 min-w-0">
                            <p class="text-sm">{user.username}</p>
                            <p class="text-sm truncate">
                                {formatActivity(user.presence?.activityType, user.presence?.activityName)}
                            </p>
                            <p class="text-xs text-base04 mt-1">{timeAgo(user.presence?.activityTimestamp)}</p>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
