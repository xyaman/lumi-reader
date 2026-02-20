import { useNavigate } from "@solidjs/router"
import { createEffect, Show } from "solid-js"
import { createStore } from "solid-js/store"
import UserList from "@/components/UserList"
import Spinner from "@/components/Spinner"
import { User } from "@/types/api"
import { userApi } from "@/api/user"
import Modal from "../Modal"

type FollowModalProps = {
    open: boolean
    onDismiss: () => void
    username: string
    type: "followers" | "following"
}

export function FollowModal(props: FollowModalProps) {
    const navigate = useNavigate()

    const [state, setState] = createStore({
        page: 1,
        totalPages: 1,
        users: [] as User[],
        hasMore: true,
        loading: false,
        error: null as string | null,
    })

    const fetchUsers = async (page: number) => {
        setState("loading", true)
        let res
        if (props.type === "followers") {
            res = await userApi.getFollowers(props.username, page)
        } else {
            res = await userApi.getFollowing(props.username, page)
        }
        setState("loading", false)
        if (res.error) {
            setState("error", `Failed to load ${props.type} list...`)
            return
        }

        setState("error", null)
        const newUsers = res.ok.data.users
        const pagy = res.ok.data.pagy

        setState("totalPages", pagy.pages)
        setState("hasMore", page < pagy.pages)
        setState("users", (prev) => (page === 1 ? newUsers : [...prev, ...newUsers]))
    }

    // Reset value every time is opened
    createEffect(() => {
        if (props.open) {
            setState({
                page: 1,
                totalPages: 1,
                users: [],
                hasMore: true,
                loading: false,
                error: null,
            })
            fetchUsers(1)
        }
    })

    // Scroll handler for infinite scroll
    const handleScroll = (e: Event) => {
        const el = e.target as HTMLDivElement
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120 && state.hasMore && !state.loading) {
            const nextPage = state.page + 1
            setState("page", nextPage)
            fetchUsers(nextPage)
        }
    }

    return (
        <Modal show={props.open} onDismiss={props.onDismiss}>
            <button class="absolute top-4 right-4 text-xl cursor-pointer" onClick={props.onDismiss} aria-label="Close">
                ×
            </button>
            <p class="text-xl mb-4">{props.type === "followers" ? "Followers" : "Following"}</p>
            <div class="max-h-96 overflow-y-auto" onScroll={handleScroll}>
                <Show when={state.error}>
                    <div class="text-center py-6 text-base05">
                        <p>{state.error}</p>
                        <button
                            class="cursor-pointer bg-base02 hover:bg-base03 px-4 rounded-md mt-2"
                            onClick={() => fetchUsers(1)}
                        >
                            Tap to retry
                        </button>
                    </div>
                </Show>
                <Show when={!state.error}>
                    <UserList
                        users={state.users}
                        onUserClick={(username) => {
                            navigate(`/users/${username}`)
                            props.onDismiss()
                        }}
                    />
                    <Show when={state.loading}>
                        <div class="flex items-center justify-center py-6">
                            <Spinner size={32} base16Color="--base05" />
                        </div>
                    </Show>
                    <Show when={!state.hasMore && state.users.length === 0 && !state.loading}>
                        <div class="text-center py-6 text-base04">No users found.</div>
                    </Show>
                </Show>
            </div>
        </Modal>
    )
}
