import { User } from "@/types/api"
import { For, Show } from "solid-js"
import UserAvatar from "./UserAvatar"

export type SimpleUser = {
    id: number
    username: string
    avatar_url: string
}

type UserListProps = {
    users: User[]
    onUserClick?: (username: string) => void
}

export default function UserList(props: UserListProps) {
    return (
        <div class="max-w-md mx-auto">
            <Show when={props.users.length > 0} fallback={<p class="text-center text-gray-500">No users found.</p>}>
                <For each={props.users}>
                    {(user) => (
                        <div
                            class="flex items-center space-x-3 mb-3 p-2 rounded bg-base01 hover:bg-base03 cursor-pointer"
                            onClick={() => props.onUserClick?.(user.username)}
                        >
                            <UserAvatar user={user} w={10} h={10} />
                            <span class="font-medium">{user.username}</span>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    )
}
