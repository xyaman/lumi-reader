import { A, useNavigate, useParams } from "@solidjs/router"
import Navbar from "./components/Navbar"
import { IconExit, IconSettings } from "./components/icons"
import { createEffect, createResource, Match, Show, Switch } from "solid-js"
import api, { IProfileInfoResponse } from "./lib/api"
import { useAuthContext } from "./context/auth"
import Spinner from "./components/Spiner"
import { createStore } from "solid-js/store"

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

function UserCard(props: UserCardProps) {
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
            <p class="text-sm">
                <span>{user().followers_count}</span> followers ·{" "}
                <span>{user().following_count}</span> following
            </p>
        </div>
    )
}

function Profile() {
    const params = useParams()
    const navigate = useNavigate()
    const { authStore, logout: localLogout } = useAuthContext()

    // --- Identity / Context ---
    const userId = () => Number(params.id ?? authStore.user?.id)
    const isOwnProfile = () => authStore.user?.id === userId()
    createEffect(() => {
        if (Number.isNaN(userId()) || userId() === 0) {
            navigate("/login", { replace: true })
        }
    })

    // --- User Resource ---
    const [user, { mutate: mutateUser }] = createResource(async () => {
        const data = await api.fetchProfileInfo(userId())
        return data.user
    })

    // --- Follow Status ---
    const [isFollowing, { mutate: setIsFollowing }] = createResource(
        () => (!isOwnProfile() && authStore.user ? true : null),
        async () => {
            const res = await api.fetchUserFollowers(userId())
            return res.followers.some((u) => u.id === authStore.user?.id)
        },
    )

    const toggleFollow = async () => {
        if (!userId() || isOwnProfile()) return
        if (isFollowing()) {
            await api.unfollow(userId())
            setIsFollowing(false)
            mutateUser((u) => u && { ...u, followers_count: u.followers_count - 1 })
        } else {
            await api.follow(userId())
            setIsFollowing(true)
            mutateUser((u) => u && { ...u, followers_count: u.followers_count + 1 })
        }
    }

    // --- Share Status ---
    const toggleShareStatus = async () => {
        if (!user()) return
        try {
            await api.updateShareStatus(!user()?.share_status)
            mutateUser((u) => u && { ...u, share_status: !u.share_status })
        } catch {}
    }

    // --- Avatar Change ---
    const changeAvatar = async (file: File) => {
        try {
            const avatar_url = (await api.updateAvatar(file)).avatar_url
            mutateUser((u) => u && { ...u, avatar_url })
        } catch (e) {
            console.error("Failed to upload avatar", e)
            alert("Failed to upload avatar.")
        }
    }

    // --- Description Editing ---
    const [descStore, setDescStore] = createStore({
        editing: false,
        value: "",
        loading: false,
        error: null as string | null,
    })

    const startEditDesc = () => {
        setDescStore({
            editing: true,
            value: user()?.description ?? "",
            loading: false,
            error: null,
        })
    }

    const cancelEditDesc = () => {
        setDescStore("editing", false)
        setDescStore("error", null)
    }

    const saveDesc = async () => {
        setDescStore("loading", true)
        setDescStore("error", null)
        try {
            await api.updateDescription(descStore.value)
            mutateUser((u) => u && { ...u, description: descStore.value })
            setDescStore("editing", false)
        } catch {
            setDescStore("error", "Failed to update description.")
        }
        setDescStore("loading", false)
    }

    // --- Logout ---
    const logout = () => {
        api.logout()
        localLogout()
        navigate("/login")
    }

    // --- Render ---
    return (
        <>
            <Navbar>
                <Navbar.Left>
                    <A
                        href="/"
                        class="text-xl font-bold hover:text-[var(--base0D)] transition-colors"
                    >
                        ← lumireader
                    </A>
                </Navbar.Left>
                <Navbar.Right>
                    <A href="/settings" class="button px-3 py-2 rounded-lg">
                        <IconSettings />
                    </A>
                    <button
                        onClick={logout}
                        class="button px-3 py-2 rounded-lg flex items-center gap-1"
                    >
                        <IconExit />
                        <span class="hidden sm:inline">Logout</span>
                    </button>
                </Navbar.Right>
            </Navbar>

            <div>
                <Switch>
                    <Match when={user.loading}>
                        <div class="flex items-center justify-center min-h-[50vh]">
                            <Spinner size={48} base16Color="--base05" />
                        </div>
                    </Match>
                    <Match when={user.error}>
                        <h1>Error when fetching: {user.error}</h1>
                    </Match>
                    <Match when={user()}>
                        <div class="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 md:gap-6">
                            <aside class="md:col-span-1 space-y-4">
                                <UserCard
                                    user={user()!}
                                    isOwnProfile={isOwnProfile()}
                                    isFollowing={isFollowing()}
                                    isEditing={descStore.editing}
                                    onButtonClick={isOwnProfile() ? startEditDesc : toggleFollow}
                                    onToggleShareStatus={toggleShareStatus}
                                    onAvatarChange={changeAvatar}
                                />
                            </aside>
                            <main class="md:col-span-2 space-y-6 mt-6 md:mt-0">
                                <section class="p-4 body-alt rounded-md">
                                    <Show
                                        when={descStore.editing}
                                        fallback={
                                            <p>{user()?.description ?? "[No description]"}</p>
                                        }
                                    >
                                        <>
                                            <textarea
                                                class="w-full p-2 border rounded"
                                                rows={3}
                                                value={descStore.value}
                                                onInput={(e) =>
                                                    setDescStore("value", e.currentTarget.value)
                                                }
                                                disabled={descStore.loading}
                                            />
                                            <div class="mt-2 flex gap-2">
                                                <button
                                                    class="button text-sm"
                                                    onClick={saveDesc}
                                                    disabled={descStore.loading}
                                                >
                                                    {descStore.loading ? "Saving..." : "Save"}
                                                </button>
                                                <button
                                                    class="button text-sm"
                                                    onClick={cancelEditDesc}
                                                    disabled={descStore.loading}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <Show when={descStore.error}>
                                                <p class="text-red-500">{descStore.error}</p>
                                            </Show>
                                        </>
                                    </Show>
                                </section>

                                <section>
                                    <h2 class="text-lg font-semibold mb-2">Reading activity</h2>
                                    <p class="text-sm font-light">No activity...</p>
                                </section>
                            </main>
                        </div>
                    </Match>
                </Switch>
            </div>
        </>
    )
}

export default Profile
