// components/UserSearchModal.tsx
import { createResource, createSignal, For, onCleanup, Show } from "solid-js"
import { userApi } from "@/api/user"
import Modal from "@/components/Modal"
import UserAvatar from "@/components/UserAvatar"
import { IconSearch } from "@/components/icons"
import { useNavigate } from "@solidjs/router"

type UserSearchModalProps = {
    show: boolean
    onDismiss: () => void
}

export function SocialSearchModal(props: UserSearchModalProps) {
    let timer: number | undefined
    const [query, setQuery] = createSignal("")
    const navigate = useNavigate()

    const [searchResults, { refetch }] = createResource(async () => {
        if (query().length < 2) return undefined
        const res = await userApi.searchUsers(query())
        return res.error ? [] : res.ok.data
    })

    const handleInput = (e: Event) => {
        const value = (e.currentTarget as HTMLInputElement).value
        setQuery(value)
        if (timer) clearTimeout(timer)
        timer = window.setTimeout(() => {
            refetch()
        }, 1000)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            if (timer) clearTimeout(timer)
            refetch()
        }
    }

    onCleanup(() => {
        if (timer) clearTimeout(timer)
    })

    const handleUserClick = (username: string) => {
        navigate(`/users/${username}`)
        props.onDismiss()
    }

    return (
        <Modal show={props.show} onDismiss={props.onDismiss}>
            <h2 class="font-semibold mb-4">Search Users</h2>

            {/* Search Input */}
            <div class="relative mb-4">
                <input
                    class="w-full p-3 pl-10 border border-base02 rounded-lg bg-base00 text-base05"
                    placeholder="Search users..."
                    value={query()}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    autofocus
                />
                <IconSearch class="absolute left-3 top-3.5 text-base04" />
            </div>

            {/* Results */}
            <div class="max-h-80 overflow-y-auto">
                <Show
                    when={query().length >= 2}
                    fallback={<p class="text-center text-base04 py-8">Type at least 2 characters to search</p>}
                >
                    <Show
                        when={!searchResults.loading && searchResults() !== undefined}
                        fallback={
                            <div class="text-center py-8">
                                <div class="animate-spin w-6 h-6 border-2 border-base0D border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        }
                    >
                        <For each={searchResults()}>
                            {(user) => (
                                <div
                                    class="flex items-center space-x-3 p-3 hover:bg-base02 rounded-lg cursor-pointer transition-colors"
                                    onClick={() => handleUserClick(user.username)}
                                >
                                    <UserAvatar user={user} w={10} h={10} />
                                    <div class="flex-1 min-w-0">
                                        <p class="font-medium truncate">{user.username}</p>
                                        <Show when={user.bio}>
                                            <p class="text-sm text-base04 truncate">{user.bio}</p>
                                        </Show>
                                    </div>
                                    <Show when={user.followersCount !== undefined}>
                                        <span class="text-xs text-base04">{user.followersCount} followers</span>
                                    </Show>
                                </div>
                            )}
                        </For>
                    </Show>
                </Show>
            </div>
        </Modal>
    )
}
