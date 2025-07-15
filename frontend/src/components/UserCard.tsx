import { useNavigate } from "@solidjs/router"
import { createResource, createSignal, Show } from "solid-js"
import UserList from "./UserList"
import Spinner from "./Spiner"
import { User } from "@/types/api"
import { userApi } from "@/api/user"

type UserModalProps = {
    open: boolean
    onClose: () => void
    userId: number
    type: "followers" | "following"
}

function UserModal(props: UserModalProps) {
    const navigate = useNavigate()
    const [users] = createResource(
        () => props.open,
        async () => {
            if (props.type === "followers") {
                const res = await userApi.getFollowers(props.userId)
                if (res.error) return []
                else return res.ok.data!.followers
            } else {
                const res = await userApi.getFollowing(props.userId)
                if (res.error) return []
                else return res.ok.data!.following
            }
        },
    )

    return (
        <Show when={props.open}>
            <div class="fixed inset-0 z-50 flex items-center justify-center">
                <div class="absolute inset-0 bg-black opacity-40" onClick={props.onClose} />
                <div class="relative bg-(--base01) rounded-lg shadow-lg mx-4 md:mx-auto w-full max-w-md p-4">
                    <button
                        class="absolute top-4 right-4 text-xl cursor-pointer"
                        onClick={props.onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                    <Show
                        when={!users.loading}
                        fallback={
                            <div class="flex items-center justify-center min-h-50">
                                <Spinner size={48} base16Color="--base05" />
                            </div>
                        }
                    >
                        <p class="text-xl">{props.type}</p>
                        <UserList
                            users={users() ?? []}
                            onUserClick={(id) => {
                                navigate(`/users/${id}`)
                                props.onClose()
                            }}
                        />
                    </Show>
                </div>
            </div>
        </Show>
    )
}

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
    const user = () => props.user

    const [modalOpen, setModalOpen] = createSignal(false)
    const [modalType, setModalType] = createSignal<"followers" | "following">("followers")

    const openModal = (type: "followers" | "following") => {
        setModalType(type)
        setModalOpen(true)
    }

    return (
        <div class="flex flex-col items-center md:items-start space-y-3">
            <div class="relative w-36 h-36 mx-auto">
                <img
                    class="w-full h-full rounded-full object-cover border border-(--base03)"
                    src={user().avatarUrl}
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
                            user().shareStatus ? "text-(--base0B)" : "text-(--base03)"
                        }`}
                    >
                        {user().shareStatus ? "Status: Sharing" : "Status: Not sharing"}
                        {user().shareStatus ? (
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
                        {user().shareStatus ? "Hide" : "Share"}
                    </button>
                </div>
            </Show>
            <p class="text-sm flex gap-2">
                <span
                    class="cursor-pointer hover:underline hover:text-(--base0B) focus:underline focus:text-(--base0B) transition"
                    tabIndex={0}
                    onClick={() => openModal("followers")}
                    role="button"
                    aria-label="View followers"
                >
                    {user().followersCount} followers
                </span>
                ·
                <span
                    class="cursor-pointer hover:underline hover:text-(--base0B) focus:underline focus:text-(--base0B) transition"
                    tabIndex={0}
                    onClick={() => openModal("following")}
                    role="button"
                    aria-label="View following"
                >
                    {user().followingCount} following
                </span>
            </p>
            <UserModal
                open={modalOpen()}
                onClose={() => setModalOpen(false)}
                userId={user().id}
                type={modalType()}
            />
        </div>
    )
}
