import { createResource, createSignal, For, Show } from "solid-js"
import Popover from "@corvu/popover"
import consumer from "@/services/websocket"
import { snakeToCamel, timeAgo } from "@/lib/utils"
import { userApi } from "@/api/user"
import UserAvatar from "./UserAvatar"
import { useAuthState } from "@/context/auth"
import { A } from "@solidjs/router"
import { IconFilter, IconSearch } from "./icons"
import { SocialSearchModal } from "./home/SocialSearchModal"
import UserStatus from "./UserStatus"
import { useIsMobile } from "@/hooks"
import { User } from "@/types/api"
import { lsSocial } from "@/services/localStorage"

export default function SocialList() {
    const authState = useAuthState()
    const isMobile = useIsMobile()

    const [showUserSearch, setShowUserSearch] = createSignal(false)
    const [userSort, setUsersSort] = createSignal<"online-status" | "alphanumeric">(lsSocial.sort())

    const sortUsers = (users: User[]) => {
        if (userSort() === "online-status") {
            return [...users].sort((a, b) => {
                if (a.presence?.status === "online" && b.presence?.status === "online") return 0
                if (a.presence?.status === "online") return 1
                return a.presence?.activityType ? -1 : 1
            })
        }

        if (userSort() === "alphanumeric") {
            return [...users].sort((a, b) => a.username.localeCompare(b.username))
        }
    }

    const [follows, { mutate: setFollowers }] = createResource(async () => {
        if (!authState.user) return []
        const res = await userApi.getFollowingPresence(authState.user!.username)
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

    const handleUsersSort = (b: "online-status" | "alphanumeric") => {
        setUsersSort(b)
        lsSocial.setSort(b)
        setFollowers((prev) => prev && sortUsers(prev))
    }

    return (
        <>
            <div class="flex justify-between items-center mb-2">
                <h2 class="font-semibold">Social Activity</h2>
                <div class="flex space-x-1">
                    <OnlineStatusPopover sort={userSort()} setSort={handleUsersSort} />
                    <button
                        class="p-1 hover:bg-base02 rounded"
                        onClick={() => setShowUserSearch(true)}
                        title="Search users"
                    >
                        <IconSearch class="w-4 h-4" />
                    </button>
                </div>
            </div>
            <Show when={authState.user && isMobile()}>
                <div class="mb-3 pb-4 border-b border-base02">
                    <div class="flex items-center space-x-3 rounded hover:bg-base02">
                        {/* User Avatar */}
                        <UserStatus h={15} w={15} user={authState.user!} />
                        <A href="/me">
                            {/* Name  */}
                            <p class="font-semibold">{authState.user?.username}</p>
                        </A>
                    </div>
                </div>
            </Show>
            <div class="space-y-5">
                <For each={follows() || []}>
                    {(user) => (
                        <A href={`/users/${user.username}`} class="block">
                            <div class="flex items-start">
                                <div class="relative">
                                    {/* Avatar */}
                                    <UserAvatar user={user} w={13} h={13} />
                                    <div
                                        class={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${user.presence?.status === "online" ? "bg-base0B" : "bg-base04"}`}
                                    />
                                </div>

                                {/* Presence */}
                                <div class="flex-1 ml-2 min-w-0">
                                    <p class="text-md">{user.username}</p>
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
            <SocialSearchModal show={showUserSearch()} onDismiss={() => setShowUserSearch(false)} />
        </>
    )
}

type OnlineStatusPopoverProps = {
    sort: "online-status" | "alphanumeric"
    setSort: (s: "online-status" | "alphanumeric") => void
}

function OnlineStatusPopover(props: OnlineStatusPopoverProps) {
    return (
        <Popover floatingOptions={{ offset: 13, flip: true, shift: true }}>
            <Popover.Trigger class="max-h-[40px] cursor-pointer px-4 rounded-md flex items-center">
                <IconFilter />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content class="z-50 rounded-lg bg-base02 px-3 py-2 shadow-md">
                    <Popover.Label class="font-bold">Sort Options</Popover.Label>
                    <div class="mt-2">
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={props.sort === "alphanumeric"}
                                    onChange={() => props.setSort("alphanumeric")}
                                />
                                <span class="ml-2">Alphanumeric</span>
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={props.sort === "online-status"}
                                    onChange={() => props.setSort("online-status")}
                                />
                                <span class="ml-2">Status</span>
                            </label>
                        </div>
                    </div>
                    <Popover.Arrow class="text-base02" />
                </Popover.Content>
            </Popover.Portal>
        </Popover>
    )
}
