import { For, Show } from "solid-js"

export type SimpleUser = {
    id: number
    username: string
    avatar_url: string
}

type UserListProps = {
    users: SimpleUser[]
    onUserClick?: (userId: number) => void
}

export default function UserList(props: UserListProps) {
    return (
        <div class="max-w-md mx-auto p-4">
            <Show
                when={props.users.length > 0}
                fallback={<p class="text-center text-gray-500">No users found.</p>}
            >
                <For each={props.users}>
                    {(user) => (
                        <div
                            class="flex items-center space-x-3 mb-3 p-2 rounded bg-(--base01) hover:bg-(--base03) cursor-pointer"
                            onClick={() => props.onUserClick?.(user.id)}
                        >
                            <img
                                src={user.avatar_url}
                                alt={`${user.username} avatar`}
                                class="w-10 h-10 rounded-full object-cover"
                            />
                            <span class="font-medium">{user.username}</span>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    )
}
