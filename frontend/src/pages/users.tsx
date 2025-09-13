import { A, useLocation, useNavigate, useParams } from "@solidjs/router"
import { createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from "solid-js"

import UserAvatar from "@/components/UserAvatar"
import { userApi } from "@/api/user"
import { User, ApiReadingSession } from "@/types/api"
import { createStore } from "solid-js/store"
import Spinner from "@/components/Spinner"
import { useAuthDispatch, useAuthState } from "@/context/auth"
import { Button } from "@/ui"
import { LumiDb } from "@/db"
import { readingSessionsApi } from "@/api/readingSessions"
import { FollowModal } from "@/components/users"
import { IconBook, IconClock } from "@/components/icons"

type UserDescriptionProps = {
    user: User
    isEditing: boolean
    onInput?: (value: string) => void
    disabled?: boolean
}
function UserDescription(props: UserDescriptionProps) {
    return (
        <Show when={props.isEditing} fallback={<p class="mb-8">{props.user.bio || ""}</p>}>
            <textarea
                class="w-full p-2 border rounded my-8"
                rows={3}
                value={props.user.bio || ""}
                onInput={(e) => props.onInput?.(e.target.value)}
                disabled={props.disabled}
            />
        </Show>
    )
}

export function Users() {
    const authState = useAuthState()
    const authDispatch = useAuthDispatch()

    const params = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    const username = () => {
        if (location.pathname === "/me") {
            return authState.user?.username
        }
        return params.username as string
    }

    const isOwnProfile = () => location.pathname === "/me" || params.username === authState.user?.username

    const [editDescription, setEditDescription] = createSignal<string | null>(null)
    const [isLoading, setIsLoading] = createSignal(false)

    // Follow modal related
    const [modalOpen, setModalOpen] = createSignal(false)
    const [modalType, setModalType] = createSignal<"followers" | "following">("followers")

    const openModal = (type: "followers" | "following") => {
        setModalType(type)
        setModalOpen(true)
    }

    const [readingStore, setReadingStore] = createStore({
        todaySessions: [] as ApiReadingSession[],
        lastWeekSessions: [] as ApiReadingSession[],
        restSessions: [] as ApiReadingSession[],
        loading: false,
    })

    const [userResource, { mutate: mutateUser }] = createResource(username, async () => {
        // this might happen when the auth still is loading
        if (!username()) {
            return undefined
        }

        if (isOwnProfile()) {
            return authState.user
        }

        const data = await userApi.getProfile(username()!)
        if (data.error) {
            throw data.error
        }
        return data.ok.data
    })

    // Go to login page if there is no param and the user is not logged in
    // Otherwise user not found?
    createEffect(() => {
        if (isOwnProfile() && authState.status === "unauthenticated") {
            return navigate("/login", { replace: true })
        }
    })

    // -- ReadingSessions fetch effect
    onMount(() => {
        const container = document.getElementById("main-container")
        if (!container) return console.error("main container not found")

        // function onScroll() {
        //     if (container!.scrollTop + container!.clientHeight >= container!.scrollHeight - 300) {
        //         loadMoreSessions()
        //     }
        // }

        // container.addEventListener("scroll", onScroll)
        // onCleanup(() => container.removeEventListener("scroll", onScroll))
    })

    // load initial sessions when the userId is determined
    createEffect(
        on(username, (value) => {
            if (!value) return
            loadMoreSessions()
        }),
    )

    const loadMoreSessions = async () => {
        if (readingStore.loading) return
        setReadingStore("loading", true)

        const res = await readingSessionsApi.index({ username: username(), group: true })
        if (res.ok) {
            const now = new Date()
            const todayStart = new Date(now)
            todayStart.setHours(0, 0, 0, 0)
            const todaySnowflake = todayStart.getTime()

            setReadingStore(
                "todaySessions",
                res.ok.data.filter((s) => s.snowflake > todaySnowflake),
            )

            const lastWeekStart = new Date(now)
            lastWeekStart.setDate(now.getDate() - 6)
            lastWeekStart.setHours(0, 0, 0, 0)
            const lastWeekSnowflake = lastWeekStart.getTime()

            setReadingStore(
                "lastWeekSessions",
                res.ok.data.filter((s) => s.snowflake > lastWeekSnowflake && s.snowflake < todaySnowflake),
            )

            setReadingStore(
                "restSessions",
                res.ok.data.filter((s) => s.snowflake <= lastWeekSnowflake),
            )
        } else {
            console.error(res.error)
        }

        setReadingStore("loading", false)
    }

    // -- input handler
    const onAvatarChange = async (f: File) => {
        if (!isOwnProfile()) return

        if (f.size / 1000000 > 2) {
            alert("Max file size: 2MB")
            return
        }

        const res = await userApi.updateAvatar(f)
        if (res.error) {
            console.error(res.error)
        } else {
            await authDispatch.refreshCurrentUser()
            mutateUser({ ...userResource()!, avatarUrl: res.ok.data })
        }
    }

    // -- buttons handlers
    const handleFollow = async () => {
        let res
        const isFollowing = !userResource()!.isFollowing
        if (userResource()!.isFollowing) {
            res = await userApi.unfollow(username()!)
        } else {
            res = await userApi.follow(username()!)
        }
        if (res.error) throw res.error
        mutateUser({ ...userResource()!, isFollowing })
    }

    const handleSaveDescription = async () => {
        const newDescription = editDescription()
        if (!newDescription) {
            return setEditDescription(null)
        }

        setIsLoading(true)
        const res = await userApi.update({ bio: newDescription })
        if (res.ok) {
            mutateUser({ ...userResource()!, bio: newDescription })
        } else {
            console.error(res.error)
        }
        setEditDescription(null)
        setIsLoading(false)
    }

    return (
        <div class="px-4 py-8">
            <Show fallback={<Spinner size={48} base16Color="--base0D" />} when={userResource()}>
                {/* Profile header */}
                <section>
                    <div class="flex gap-8 flex-col md:flex-row">
                        <div class="m-auto">
                            {/* Avatar */}
                            <UserAvatar
                                user={userResource()!}
                                w={40}
                                h={40}
                                onAvatarChange={onAvatarChange}
                                isUserPage={isOwnProfile()}
                            />
                        </div>

                        {/* Profile info */}
                        <div class="flex-1">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-0">
                                <h1 class="text-3xl font-bold">{userResource()!.username}</h1>

                                <div class="flex gap-2">
                                    <Switch>
                                        <Match when={editDescription() !== null}>
                                            <Button onClick={() => setEditDescription(null)}>Cancel</Button>
                                            <Button onClick={handleSaveDescription}>Save</Button>
                                        </Match>

                                        <Match when={authState.user && isOwnProfile()}>
                                            <>
                                                <Button onClick={() => setEditDescription("")}>Edit description</Button>
                                                <A href="/settings">
                                                    <Button>Settings</Button>
                                                </A>
                                            </>
                                        </Match>

                                        <Match when={authState.user && !isOwnProfile()}>
                                            <Button onClick={handleFollow}>
                                                {userResource()!.isFollowing ? "Unfollow" : "Follow"}
                                            </Button>
                                        </Match>
                                    </Switch>
                                </div>
                            </div>

                            {/* Description */}
                            <UserDescription
                                user={userResource()!}
                                isEditing={editDescription() !== null}
                                onInput={setEditDescription}
                                disabled={isLoading()}
                            />

                            {/* Stats */}
                            <div class="flex gap-8">
                                <button
                                    class="text-2xl font-bold cursor-pointer hover:text-base0D transition"
                                    onClick={() => openModal("followers")}
                                    aria-label="View followers"
                                >
                                    {userResource()!.followersCount || 0}
                                    <span class="block text-sm">Followers</span>
                                </button>
                                <button
                                    class="text-2xl font-bold cursor-pointer hover:text-base0D transition"
                                    onClick={() => openModal("following")}
                                    aria-label="View following"
                                >
                                    {userResource()!.followingCount || 0}
                                    <span class="block text-sm">Following</span>
                                </button>
                            </div>
                            <FollowModal
                                open={modalOpen()}
                                onDismiss={() => setModalOpen(false)}
                                username={userResource()!.username}
                                type={modalType()}
                            />
                        </div>
                    </div>
                </section>

                {/* Stats section */}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div class="bg-base01 rounded-xl p-6 flex items-center gap-3">
                        <span class="bg-base02 p-5 rounded-xl">
                            <IconBook />
                        </span>
                        <div>
                            <p>Books Read</p>
                            <p class="text-2xl font-bold">{userResource()?.stats.totalBooks}</p>
                        </div>
                    </div>

                    <div class="bg-base01 rounded-xl p-6 flex items-center gap-3">
                        <span class="bg-base02 p-5 rounded-xl">
                            <IconClock />
                        </span>
                        <div>
                            <p>Hours read</p>
                            <p class="text-2xl font-bold">{userResource()?.stats.totalReadingHours}</p>
                        </div>
                    </div>
                </div>

                {/* Sessions/Activity */}
                <section class="mt-12">
                    <h2 class="text-2xl font-bold mb-6 p-2 border-b border-base03">Recent Reading Activity</h2>
                    <Show when={readingStore.loading}>
                        <Spinner size={40} base16Color="--base05" />
                    </Show>
                    <div class="bg-base01 divide-y divide-base02">
                        <Show when={readingStore.todaySessions.length > 0}>
                            <h3 class="px-6 pt-4 pb-2 text-sm font-medium text-base04">TODAY</h3>
                            <For each={readingStore.todaySessions}>
                                {(session) => <SessionCard session={session} />}
                            </For>
                        </Show>

                        <Show when={readingStore.lastWeekSessions.length > 0}>
                            <h3 class="px-6 pt-4 pb-2 text-sm font-medium text-base04">THIS WEEK</h3>
                            <For each={readingStore.lastWeekSessions}>
                                {(session) => <SessionCard session={session} />}
                            </For>
                        </Show>

                        <Show when={readingStore.restSessions.length > 0}>
                            <h3 class="px-6 pt-4 pb-2 text-sm font-medium text-base04">OLDER</h3>
                            <For each={readingStore.restSessions}>{(session) => <SessionCard session={session} />}</For>
                        </Show>
                    </div>
                </section>
            </Show>
        </div>
    )
}

function SessionCard(props: { session: ApiReadingSession }) {
    const [coverUrl, setCoverUrl] = createSignal("https://placehold.co/96x128?text=Cover")

    createEffect(() => {
        const uniqueId = props.session.bookId

        ;(async () => {
            const lightbook = await LumiDb.readerLightSources.get({ uniqueId })
            if (lightbook) {
                const blobUrl = URL.createObjectURL(lightbook.coverImage!.blob)
                setCoverUrl(blobUrl)
            }
        })()

        onCleanup(() => {
            const blobUrl = !coverUrl().includes("placehold") ? coverUrl() : null
            if (blobUrl) URL.revokeObjectURL(blobUrl)
        })
    })

    const timeSpent = () => (props.session.timeSpent / 3600).toFixed(2)
    const date = () => new Date(props.session.snowflake).toDateString()

    return (
        <div class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-start gap-4">
                <Show when={coverUrl()} fallback={<IconBook />}>
                    <img src={coverUrl()} class="w-12 h-16 rounded object-cover" />
                </Show>
                <div>
                    <h4>{props.session.bookTitle}</h4>
                    <p class="text-sm text-base04">Last read: {date()}</p>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <p>Time</p>
                    <p class="font-medium">{timeSpent()} hours</p>
                </div>
                <div>
                    <p>Chars Read</p>
                    <p class="font-medium">{props.session.charsRead} chars</p>
                </div>
            </div>
        </div>
    )
}
