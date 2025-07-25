import { useNavigate, useParams } from "@solidjs/router"
import { useAuthContext } from "@/context/session"
import {
    createEffect,
    createResource,
    createSignal,
    For,
    Match,
    onCleanup,
    onMount,
    Show,
    Switch,
} from "solid-js"
import UserAvatar from "@/components/UserAvatar"
import { userApi } from "./api/user"
import { User, ReadingSession } from "./types/api"
import { LumiDb } from "./lib/db"
import { IndividualSessions } from "./ReadingSessionsPage"
import { createStore } from "solid-js/store"
import { readingSessionsApi } from "./api/readingSessions"
import Spinner from "./components/Spiner"

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

export default function UserPage() {
    const { sessionStore } = useAuthContext()
    const params = useParams()
    const navigate = useNavigate()

    const userId = () => Number(params.id ?? sessionStore.user?.id)
    const isOwnId = () => sessionStore.user?.id == userId()

    const [editDescription, setEditDescription] = createSignal<string | null>(null)
    const [isLoading, setIsLoading] = createSignal(false)
    const [readingStore, setReadingStore] = createStore({
        sessions: [] as ReadingSession[],
        loading: false,
        page: 0,
        pages: 1,
    })

    const [user, { mutate: mutateUser }] = createResource(userId, async () => {
        const data = await userApi.getProfile(userId())
        if (data.error) {
            throw data.error
        }
        return data.ok.data!.user
    })

    // Go to login page if there is no param and the user is not logged in
    // Otherwise user not found?
    createEffect(() => {
        if (Number.isNaN(userId()) || userId() === 0) {
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

        loadMoreSessions()
        container.addEventListener("scroll", onScroll)
        onCleanup(() => container.removeEventListener("scroll", onScroll))
    })

    const loadMoreSessions = async () => {
        if (readingStore.loading) return
        setReadingStore("loading", true)

        if (isOwnId()) {
            // local sessions
            const res = await LumiDb.getRecentReadingSessions(readingStore.page)
            if (res.length === 0) {
                setReadingStore("loading", false)
                return
            }
            setReadingStore("sessions", (sessions) => [...sessions, ...res])
            setReadingStore("page", (page) => page + 1)
        } else {
            // backend sessions (other users)
            // it means we are at the end
            if (readingStore.page >= readingStore.pages) return

            // backend pages starts at 1 (pagy ruby)
            const res = await readingSessionsApi.getRecent(userId(), readingStore.page + 1)
            if (res.ok) {
                setReadingStore("sessions", res.ok.data!.sessions)
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
            mutateUser({ ...user()!, avatarUrl: res.ok.data!.avatarUrl })
        }
    }

    // -- buttons handlers
    const handleFollow = async () => {
        let res
        const following = !user()!.following
        if (user()!.following) {
            res = await userApi.unfollow(userId())
        } else {
            res = await userApi.follow(userId())
        }
        if (res.error) throw res.error
        mutateUser({ ...user()!, following })
    }

    const handleSaveDescription = async () => {
        const newDescription = editDescription()
        if (!newDescription) {
            return setEditDescription(null)
        }

        setIsLoading(true)
        const res = await userApi.updateDescription(newDescription)
        if (res.ok) {
            mutateUser({ ...user()!, description: editDescription()! })
        } else {
            console.error(res.error)
        }
        setEditDescription(null)
        setIsLoading(false)
    }

    return (
        <div class="px-4 py-8">
            <Show when={user()}>
                {/* Profile header */}
                <section>
                    <div class="flex gap-8">
                        {/* Avatar */}
                        <UserAvatar user={user()!} w={40} h={40} onAvatarChange={onAvatarChange} />

                        {/* Profile info */}
                        <div class="flex-1">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-0">
                                <h1 class="text-3xl font-bold">{user()!.username}</h1>

                                <Switch>
                                    <Match when={editDescription() !== null}>
                                        <div class="flex gap-2">
                                            <button
                                                class="button text-center"
                                                onClick={() => setEditDescription(null)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                class="button text-center"
                                                onClick={handleSaveDescription}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </Match>
                                    <Match when={sessionStore.user && isOwnId()}>
                                        <button
                                            class="button text-center"
                                            onClick={() => setEditDescription("")}
                                        >
                                            Edit description
                                        </button>
                                    </Match>
                                    <Match when={sessionStore.user && !isOwnId()}>
                                        <button class="button text-center" onClick={handleFollow}>
                                            {user()!.following ? "Unfollow" : "Follow"}
                                        </button>
                                    </Match>
                                </Switch>
                            </div>

                            {/* Description */}
                            <UserDescription
                                user={user()!}
                                isEditing={editDescription() !== null}
                                onInput={descriptionOnInput}
                                disabled={isLoading()}
                            />

                            {/* Stats */}
                            <div class="flex gap-8">
                                <div>
                                    <span class="block text-2xl font-bold">
                                        {user()!.followersCount || 0}
                                    </span>
                                    <span class="text-sm">Followers</span>
                                </div>
                                <div>
                                    <span class="block text-2xl font-bold">
                                        {user()!.followingCount || 0}
                                    </span>
                                    <span class="text-sm">Following</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* Sessions/Activity */}
                <section class="mt-12">
                    <h2 class="text-2xl font-bold mb-6 p-2 border-b border-base03">
                        Recent Reading Activity
                    </h2>
                    <Show
                        when={!readingStore.loading}
                        fallback={<Spinner size={40} base16Color="--base05" />}
                    >
                        <For each={readingStore.sessions ?? []}>
                            {(session) => <IndividualSessions session={session} />}
                        </For>
                    </Show>
                </section>
            </Show>
        </div>
    )
}
