import { For, Show, createEffect, onMount } from "solid-js"
import { useAuthContext } from "@/context/auth"
import { useWebSocket } from "@/context/websocket"
import { timeAgo } from "@/lib/utils"
import { A } from "@solidjs/router"
import { PartialUser } from "@/lib/api"

interface User {
    id: number
    username: string
    avatar_url?: string
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

function ActivityStatus(props: { user: PartialUser }) {
    return (
        <Show
            when={props.user.last_activity}
            fallback={<div class="text-xs mt-1 italic">No recent activity</div>}
        >
            <div class="text-xs mt-1">
                <div class="truncate">{timeAgo(props.user.timestamp)}</div>
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

function FollowingCard(props: { user: PartialUser }) {
    return (
        <div class="bg-(--base00) hover:bg-(--base02) p-2 rounded-md text-sm">
            <A href={`/users/${props.user.id}`}>
                <div class="flex items-center space-x-2">
                    <div class="relative flex-shrink-0">
                        <UserAvatar user={props.user} />
                        <OnlineStatusIndicator isOnline={props.user.online} />
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium truncate">{props.user.username}</p>
                        <ActivityStatus user={props.user} />
                    </div>
                </div>
            </A>
        </div>
    )
}

export default function FollowingActivitySidebar() {
    const { authStore } = useAuthContext()
    const { websocket, following, fetchSessions } = useWebSocket()

    onMount(() => {
        websocket.initializeConnection()
        fetchSessions()
    })

    // update filter
    createEffect(() => {
        console.log("following", following())
    })

    return (
        <aside class="navbar-theme hidden md:flex p-4 flex-col w-48 lg:w-64 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            <Show
                when={following()}
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
                        each={following()}
                        fallback={<p class="text-sm text-center mt-4">No followings found</p>}
                    >
                        {(following) => <FollowingCard user={following} />}
                    </For>
                </div>
            </Show>
        </aside>
    )
}
