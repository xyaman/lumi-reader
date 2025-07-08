import { For, Show, createResource, createMemo, createEffect, onMount } from "solid-js"
import { useAuthContext } from "@/context/auth"
import { useWebSocket } from "@/context/websocket"
import api from "@/lib/api"
import { timeAgo } from "@/lib/utils"
import { A } from "@solidjs/router"

interface User {
    id: number
    username: string
    avatar_url?: string
}

interface UserWithStatus extends User {
    status?: {
        last_activity: string
        online: boolean
        timestamp: string
    }
}

function UserAvatar(props: { user: User }) {
    return (
        <Show
            when={props.user.avatar_url}
            fallback={
                <div class="bg-(--base01) w-8 h-8 rounded-full flex items-center justify-center">
                    <span class="text-xs font-medium">
                        {props.user.username.charAt(0).toUpperCase()}
                    </span>
                </div>
            }
        >
            <img
                src={props.user.avatar_url}
                alt={`${props.user.username}'s avatar`}
                class="w-8 h-8 rounded-full object-cover"
            />
        </Show>
    )
}

function OnlineStatusIndicator(props: { isOnline?: boolean }) {
    return (
        <div
            class={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${
                props.isOnline ? "bg-(--base0B)" : "bg-gray-400"
            }`}
        />
    )
}

function ActivityStatus(props: { status?: UserWithStatus["status"] }) {
    return (
        <Show
            when={props.status?.last_activity}
            fallback={<div class="text-xs mt-1 italic">No recent activity</div>}
        >
            <div class="text-xs mt-1">
                <div class="truncate">{props.status!.timestamp}</div>
            </div>
        </Show>
    )
}

function UserCard(props: { user: User }) {
    return (
        <div class="bg-(--base00) p-2 rounded-md text-sm mb-3 border border-(--base02)">
            <A href="/users">
                <div class="flex items-center space-x-2">
                    <div class="relative flex-shrink-0">
                        <UserAvatar user={props.user} />
                        <OnlineStatusIndicator isOnline={true} />
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium truncate">
                            {props.user.username} <span class="text-xs text-gray-500">(You)</span>
                        </p>
                    </div>
                </div>
            </A>
        </div>
    )
}

function FollowingCard(props: { following: UserWithStatus }) {
    return (
        <div class="bg-(--base00) hover:bg-(--base02) p-2 rounded-md text-sm">
            <A href={`/users/${props.following.id}`}>
                <div class="flex items-center space-x-2">
                    <div class="relative flex-shrink-0">
                        <UserAvatar user={props.following} />
                        <OnlineStatusIndicator isOnline={props.following.status?.online} />
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium truncate">{props.following.username}</p>
                        <ActivityStatus status={props.following.status} />
                    </div>
                </div>
            </A>
        </div>
    )
}

export default function FollowingActivitySidebar() {
    const { authStore } = useAuthContext()
    const webSocket = useWebSocket()

    const [followingsList] = createResource(
        () => authStore.user,
        async (currUser) => {
            if (!currUser) return []
            const res = await api.fetchUserFollows(currUser.id)
            return res.following
        },
    )

    onMount(() => {
        webSocket.connect()
    })

    createEffect(() => {
        const list = followingsList()
        if (list && list.length > 0) {
            const userIds = list.map((f: any) => f.id)
            webSocket.updateFilter(userIds)
        }
    })

    const followings = createMemo(() => {
        const list = followingsList()
        if (!list) return []

        const userStatuses = webSocket.store.userStatuses

        return list
            .map((f: any) => {
                const status = userStatuses[f.id]
                return {
                    ...f,
                    status: status
                        ? {
                              last_activity: status.last_activity,
                              online: status.online,
                              timestamp: status.timestamp
                                  ? timeAgo(status.timestamp)
                                  : "No recent activity",
                          }
                        : undefined,
                }
            })
            .sort((a, b) => {
                if (a.status?.online && !b.status?.online) return -1
                if (!a.status?.online && b.status?.online) return 1
                if (!a.status && !b.status) return 0
                if (!a.status) return 1
                if (!b.status) return -1
                if (a.status?.timestamp && b.status?.timestamp) {
                    return b.status.timestamp - a.status.timestamp
                }
                return 0
            })
    })

    return (
        <aside class="navbar-theme hidden md:flex p-4 flex-col w-48 lg:w-64 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            <Show
                when={!followingsList.loading}
                fallback={
                    <div class="flex-1 flex items-center justify-center">
                        <p class="text-sm text-gray-500">Loading...</p>
                    </div>
                }
            >
                <div id="followings-scroll" class="overflow-y-auto flex-1 space-y-3">
                    <Show when={authStore.user}>
                        <UserCard user={authStore.user!} />
                    </Show>

                    <For
                        each={followings() || []}
                        fallback={<p class="text-sm text-center mt-4">No followings found</p>}
                    >
                        {(following) => <FollowingCard following={following} />}
                    </For>
                </div>
            </Show>
        </aside>
    )
}
