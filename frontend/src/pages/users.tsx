import { A, useLocation, useNavigate, useParams } from "@solidjs/router"
import { createEffect, createResource, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from "solid-js"

import UserAvatar from "@/components/UserAvatar"
import { userApi } from "@/api/user"
import { User, ApiReadingSession } from "@/types/api"
import { IndividualSessions } from "@/components/home/readingSessions"
import { createStore } from "solid-js/store"
import Spinner from "@/components/Spinner"
import { useAuthState } from "@/context/auth"
import { Button } from "@/ui"
import { LumiDb } from "@/db"
import { deserializeApiReadingSession, readingSessionsApi, serializeApiReadingSession } from "@/api/readingSessions"
import { FollowModal } from "@/components/users"

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
        sessions: [] as ApiReadingSession[],
        loading: false,
        morePages: true,
        page: 0,
        pages: 1,
    })

    const [userResource, { mutate: mutateUser }] = createResource(username, async () => {
        // this might happen when the auth still is loading
        if (!username()) {
            return undefined
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
        console.log(authState.status)
        if (isOwnProfile() && authState.status === "unauthenticated") {
            return navigate("/login", { replace: true })
        }
    })

    // -- ReadingSessions fetch effect
    onMount(() => {
        const container = document.getElementById("main-container")
        if (!container) return console.error("main container not found")

        function onScroll() {
            if (container!.scrollTop + container!.clientHeight >= container!.scrollHeight - 300) {
                loadMoreSessions()
            }
        }

        container.addEventListener("scroll", onScroll)
        onCleanup(() => container.removeEventListener("scroll", onScroll))
    })

    // load initial sessions when the userId is determined
    createEffect(
        on(username, (value) => {
            if (!value) return
            loadMoreSessions()
        }),
    )

    const loadMoreSessions = async () => {
        if (readingStore.loading || !readingStore.morePages) return
        setReadingStore("loading", true)
        console.log("loading more..")

        if (isOwnProfile()) {
            // local sessions
            const res = await LumiDb.getRecentReadingSessions(readingStore.page)
            if (res.length === 0) {
                setReadingStore("loading", false)
                setReadingStore("morePages", false)
                return
            }
            setReadingStore("sessions", (sessions) => [...sessions, ...res.map(serializeApiReadingSession)])
            setReadingStore("page", (page) => page + 1)
        } else {
            // backend sessions (other users)
            // it means we are at the end
            if (readingStore.page >= readingStore.pages) {
                setReadingStore("loading", false)
                setReadingStore("morePages", false)
                return
            }

            // backend pages starts at 1 (pagy ruby)
            const res = await readingSessionsApi.getRecent(username()!, readingStore.page + 1)
            if (res.ok) {
                setReadingStore("sessions", (sessions) => [...sessions, ...res.ok.data.sessions])
                setReadingStore("page", (page) => page + 1)
                setReadingStore("pages", res.ok.data.pagy.pages)
            } else {
                console.error(res.error)
            }
        }

        setReadingStore("loading", false)
    }

    // -- input handler
    const descriptionOnInput = (v: string) => {
        setEditDescription(v)
    }

    const onAvatarChange = async (f: File) => {
        if (f.size / 1000000 > 2) {
            alert("Max file size: 2MB")
            return
        }

        const res = await userApi.updateAvatar(f)
        if (res.error) {
            console.error(res.error)
        } else {
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
        const res = await userApi.updateBio(newDescription)
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
                                isCurrentUser={isOwnProfile()}
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
                                onInput={descriptionOnInput}
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
                {/* Sessions/Activity */}
                <section class="mt-12">
                    <h2 class="text-2xl font-bold mb-6 p-2 border-b border-base03">Recent Reading Activity</h2>
                    <Show when={readingStore.loading}>
                        <Spinner size={40} base16Color="--base05" />
                    </Show>
                    <For each={readingStore.sessions}>
                        {(session) => <IndividualSessions session={deserializeApiReadingSession(session)} />}
                    </For>
                </section>
            </Show>
        </div>
    )
}
