import { A, useNavigate, useParams } from "@solidjs/router"
import Navbar from "./components/Navbar"
import { IconExit, IconSearch, IconSettings } from "./components/icons"
import { createEffect, createResource, Match, Show, Switch } from "solid-js"
import { useAuthContext } from "./context/session"
import Spinner from "./components/Spiner"
import { createStore } from "solid-js/store"
import UserCard from "./components/UserCard"
import { authApi } from "@/api/auth"
import { userApi } from "@/api/user"
import { User } from "./types/api"

function Profile() {
    const params = useParams()
    const navigate = useNavigate()
    const { sessionStore: authStore, closeSession } = useAuthContext()

    // --- Identity / Context ---
    const userId = () => Number(params.id ?? authStore.user?.id)
    const isOwnProfile = () => authStore.user?.id === userId()
    createEffect(() => {
        if (Number.isNaN(userId()) || userId() === 0) {
            navigate("/login", { replace: true })
        }
    })

    // --- User Resource ---
    const [user, { mutate: mutateUser }] = createResource(userId, async () => {
        const data = await userApi.getProfile(userId())
        if (data.error) {
            console.log(data.error.message)
            return {} as User
        }
        return data.ok.data!.user
    })

    // --- Follow Status ---
    // TODO: Use new route
    const [isFollowing, { mutate: setIsFollowing }] = createResource(
        () => (!isOwnProfile() && authStore.user ? true : null),
        async () => {
            const res = await userApi.getFollowers(userId())
            if (res.error) {
                console.log(res.error.message)
                return false
            }
            return res.ok.data!.followers.some((u) => u.id === authStore.user?.id)
        },
    )

    const toggleFollow = async () => {
        if (!userId() || isOwnProfile()) return
        if (isFollowing()) {
            const res = await userApi.unfollow(userId())
            if (res.ok) {
                setIsFollowing(false)
                mutateUser((u) => u && { ...u, followersCount: u.followersCount! - 1 })
            }
        } else {
            const res = await userApi.follow(userId())
            if (res.ok) {
                setIsFollowing(true)
                mutateUser((u) => u && { ...u, followersCount: u.followersCount! + 1 })
            }
        }
    }

    // --- Share Status ---
    const toggleShareStatus = async () => {
        if (!user()) return
        const res = await userApi.updateShareStatus(!user()?.shareStatus)
        if (res.ok) {
            mutateUser((u) => u && { ...u, shareStatus: !u.shareStatus })
        }
    }

    // --- Avatar Change ---
    const changeAvatar = async (file: File) => {
        const res = await userApi.updateAvatar(file)
        if (res.error) {
            console.error("Failed to upload avatar", res.error.message)
            alert("Failed to upload avatar. " + res.error.message)
            return
        }
        const avatarUrl = res.ok.data!.avatarUrl
        mutateUser((u) => u && { ...u, avatarUrl })
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

        const res = await userApi.updateDescription(descStore.value)
        if (res.error) {
            return setDescStore("error", "Failed to update description.")
        } else {
            mutateUser((u) => u && { ...u, description: descStore.value })
            setDescStore("editing", false)
        }

        setDescStore("loading", false)
    }

    const logout = () => {
        authApi.logout()
        closeSession()
        navigate("/login")
    }

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
                    <button
                        onClick={() => navigate("/users/search")}
                        class="button px-3 py-2"
                        aria-label="Search"
                        title="Search"
                    >
                        <IconSearch />
                    </button>
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
