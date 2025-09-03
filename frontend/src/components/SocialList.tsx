import { createResource, For } from "solid-js"
import consumer from "@/services/websocket"
import { snakeToCamel, timeAgo } from "@/lib/utils"
import { userApi } from "@/api/user"
import UserAvatar from "./UserAvatar"
import { useAuthState } from "@/context/auth"
import { A } from "@solidjs/router"

export default function SocialList() {
    const authState = useAuthState()

    const [follows, { mutate: setFollowers }] = createResource(async () => {
        if (!authState.user) return []
        const res = await userApi.getFollowing(authState.user!.username, true)
        if (res.error) throw res.error
        return res.ok.data
    })

    // TODO: Handle errors
    consumer.subscriptions.create(
        { channel: "UserPresenceChannel" },
        {
            connected() {
                console.log("[websocket]: connected")
            },
            disconnected() {
                console.log("[websocket]: disconnected")
            },
            received(data: { user_id: number; presence: any }) {
                const camelData = snakeToCamel(data)
                setFollowers(
                    (prev) =>
                        prev &&
                        prev.map((u) =>
                            u.id === camelData.userId ? { ...u, presence: { ...camelData.presence } } : u,
                        ),
                )

                console.log(follows())
            },
        },
    )

    const formatActivity = (kind: string | undefined, name: string | undefined, isOnline: boolean) => {
        if (!kind || !name) return ""

        if (kind === "reading") {
            return isOnline ? `Reading ${name}` : `Was reading ${name}`
        }

        return name
    }

    return (
        <div class="space-y-3">
            <For each={follows() || []}>
                {(user) => (
                    <A href={`/users/${user.username}`} class="block">
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
                                    {formatActivity(
                                        user.presence?.activityType,
                                        user.presence?.activityName,
                                        user.presence?.status === "online",
                                    )}
                                </p>
                                <p class="text-xs text-base04 mt-1">{timeAgo(user.presence?.activityTimestamp)}</p>
                            </div>
                        </div>
                    </A>
                )}
            </For>
        </div>
    )
}
