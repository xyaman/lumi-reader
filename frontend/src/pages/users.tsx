import { useNavigate, useParams } from "@solidjs/router"
import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    Match,
    on,
    onCleanup,
    onMount,
    Show,
    Switch,
} from "solid-js"

import UserAvatar from "@/components/UserAvatar"
import { userApi } from "@/api/user"
import { User, ReadingSession } from "@/types/api"
import { LumiDb } from "@/lib/db"
import { IndividualSessions } from "@/components/home/readingSessions"
import { createStore } from "solid-js/store"
import { readingSessionsApi } from "@/api/readingSessions"
import Spinner from "@/components/Spiner"
import { useAuthState } from "@/context/auth"
import { Button } from "@/ui"

type UserDescriptionProps = {
    user: User
    isEditing: boolean
    onInput?: (value: string) => void
    disabled?: boolean
}
function UserDescription(props: UserDescriptionProps) {
    return (
        <Show when={props.isEditing} fallback={<p class="mb-8">{props.user.description || ""}</p>}>
            <textarea
                class="w-full p-2 border rounded my-8"
                rows={3}
                value={props.user.description || ""}
                onInput={(e) => props.onInput?.(e.target.value)}
                disabled={props.disabled}
            />
        </Show>
    )
}

export function Users() {
    const authState = useAuthState()

    const params = useParams()
    const navigate = useNavigate()

    const userId = createMemo(() => Number(params.id ?? authState.user?.id))
    const isOwnId = () => authState.user?.id == userId()

    const [editDescription, setEditDescription] = createSignal<string | null>(null)
    const [isLoading, setIsLoading] = createSignal(false)

    const [readingStore, setReadingStore] = createStore({
        sessions: [] as ReadingSession[],
        loading: false,
        morePages: true,
        page: 0,
        pages: 1,
    })

    const [userResource, { mutate: mutateUser }] = createResource(userId, async () => {
        // this might happen when the auth still is loading
        if (Number.isNaN(userId())) {
            return undefined
        }

        const data = await userApi.getProfile(userId())
        if (data.error) {
            throw data.error
        }
        return data.ok.data!.user
    })

    // Go to login page if there is no param and the user is not logged in
    // Otherwise user not found?
    createEffect(() => {
        if (authState.status !== "loading" && Number.isNaN(userId())) {
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
        on(userId, (value) => {
            if (Number.isNaN(value)) return
            loadMoreSessions()
        }),
    )

    const loadMoreSessions = async () => {
        if (readingStore.loading || !readingStore.morePages) return
        setReadingStore("loading", true)
        console.log("loading more..")

        if (isOwnId()) {
            // local sessions
            const res = await LumiDb.getRecentReadingSessions(readingStore.page)
            if (res.length === 0) {
                setReadingStore("loading", false)
                setReadingStore("morePages", false)
                return
            }
            setReadingStore("sessions", (sessions) => [...sessions, ...res])
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
            const res = await readingSessionsApi.getRecent(userId(), readingStore.page + 1)
            if (res.ok) {
                setReadingStore("sessions", (sessions) => [...sessions, ...res.ok.data!.sessions])
                setReadingStore("page", (page) => page + 1)
                setReadingStore("pages", res.ok.data!.pagy.pages)
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
            mutateUser({ ...userResource()!, avatarUrl: res.ok.data!.avatarUrl })
        }
    }

    // -- buttons handlers
    const handleFollow = async () => {
        let res
        const following = !userResource()!.following
        if (userResource()!.following) {
            res = await userApi.unfollow(userId())
        } else {
            res = await userApi.follow(userId())
        }
        if (res.error) throw res.error
        mutateUser({ ...userResource()!, following })
    }

    const handleSaveDescription = async () => {
        const newDescription = editDescription()
        if (!newDescription) {
            return setEditDescription(null)
        }

        setIsLoading(true)
        const res = await userApi.updateDescription(newDescription)
        if (res.ok) {
            mutateUser({ ...userResource()!, description: editDescription()! })
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
                    <div class="flex gap-8">
                        {/* Avatar */}
                        <UserAvatar user={userResource()!} w={40} h={40} onAvatarChange={onAvatarChange} />

                        {/* Profile info */}
                        <div class="flex-1">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-0">
                                <h1 class="text-3xl font-bold">{userResource()!.username}</h1>

                                <Switch>
                                    <Match when={editDescription() !== null}>
                                        <div class="flex gap-2">
                                            <Button
                                                classList={{ "text-center": true }}
                                                onClick={() => setEditDescription(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button classList={{ "text-center": true }} onClick={handleSaveDescription}>
                                                Save
                                            </Button>
                                        </div>
                                    </Match>
                                    <Match when={authState.user && isOwnId()}>
                                        <Button
                                            classList={{ "text-center": true }}
                                            onClick={() => setEditDescription("")}
                                        >
                                            Edit description
                                        </Button>
                                    </Match>
                                    <Match when={authState.user && !isOwnId()}>
                                        <Button classList={{ "text-center": true }} onClick={handleFollow}>
                                            {userResource()!.following ? "Unfollow" : "Follow"}
                                        </Button>
                                    </Match>
                                </Switch>
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
                                <div>
                                    <span class="block text-2xl font-bold">{userResource()!.followersCount || 0}</span>
                                    <span class="text-sm">Followers</span>
                                </div>
                                <div>
                                    <span class="block text-2xl font-bold">{userResource()!.followingCount || 0}</span>
                                    <span class="text-sm">Following</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Sessions/Activity */}
                <section class="mt-12">
                    <h2 class="text-2xl font-bold mb-6 p-2 border-b border-base03">Recent Reading Activity</h2>
                    <Show when={readingStore.loading}>
                        <Spinner size={40} base16Color="--base05" />
                    </Show>
                    <For each={readingStore.sessions}>{(session) => <IndividualSessions session={session} />}</For>
                </section>
            </Show>
        </div>
    )
}
