import type { IProfileInfoResponse } from "@/lib/api"
import { useNavigate } from "@solidjs/router"
import { Show } from "solid-js"

type User = IProfileInfoResponse["user"]
type UserCardProps = {
    user: User
    isOwnProfile: boolean
    isFollowing?: boolean
    onButtonClick?: (() => Promise<void>) | (() => void)
    isEditing?: boolean
    onToggleShareStatus?: () => void
    onAvatarChange?: (file: File) => void
}

export default function UserCard(props: UserCardProps) {
    const navigate = useNavigate()
    const user = () => props.user

    return (
        <div class="flex flex-col items-center md:items-start space-y-3">
            <div class="relative w-36 h-36 mx-auto">
                <img
                    class="w-full h-full rounded-full object-cover border border-(--base03)"
                    src={user().avatar_url}
                    alt="User avatar"
                />
                <Show when={props.isOwnProfile}>
                    <label class="button absolute bottom-0 right-0 text-xs px-2 py-1 rounded cursor-pointer">
                        Change
                        <input
                            type="file"
                            accept="image/*"
                            class="hidden"
                            onChange={(e) => {
                                const file = e.currentTarget.files?.[0]
                                if (file && props.onAvatarChange) {
                                    if (file.size / 1000000 > 2) {
                                        alert("Max file size: 2MB")
                                        return
                                    }

                                    props.onAvatarChange(file)
                                }
                            }}
                        />
                    </label>
                </Show>
            </div>
            <p class="text-3xl font-semibold">{user().username}</p>
            <button
                class="button-alt w-full py-1 text-sm"
                classList={{ "opacity-50 cursor-not-allowed": props.isEditing }}
                onClick={props.onButtonClick}
                disabled={props.isEditing}
            >
                {props.isOwnProfile
                    ? "Edit description"
                    : props.isFollowing
                      ? "Unfollow"
                      : "Follow"}
            </button>
            <Show when={props.isOwnProfile}>
                <div class="w-full flex items-center justify-between gap-2 text-xs font-medium">
                    <span
                        class={`flex items-center gap-1 ${
                            user().share_status ? "text-(--base0B)" : "text-(--base03)"
                        }`}
                    >
                        {user().share_status ? "Status: Sharing" : "Status: Not sharing"}
                        {user().share_status ? (
                            <svg width="14" height="14" fill="currentColor">
                                <circle cx="7" cy="7" r="6" />
                            </svg>
                        ) : (
                            <svg
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <circle cx="7" cy="7" r="6" />
                            </svg>
                        )}
                    </span>
                    <button
                        class="button-alt px-2 py-1 text-xs"
                        onClick={props.onToggleShareStatus}
                    >
                        {user().share_status ? "Hide" : "Share"}
                    </button>
                </div>
            </Show>
            <p class="text-sm flex gap-2">
                <span
                    class="cursor-pointer hover:underline hover:text-(--base0B) focus:underline focus:text-(--base0B) transition"
                    tabIndex={0}
                    onClick={() => navigate(`/users/${user().id}/followers`)}
                    role="button"
                    aria-label="View followers"
                >
                    {user().followers_count} followers
                </span>
                ·
                <span
                    class="cursor-pointer hover:underline hover:text-(--base0B) focus:underline focus:text-(--base0B) transition"
                    tabIndex={0}
                    onClick={() => navigate(`/users/${user().id}/following`)}
                    role="button"
                    aria-label="View following"
                >
                    {user().following_count} following
                </span>
            </p>
        </div>
    )
}
