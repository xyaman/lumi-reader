import { useNavigate } from "@solidjs/router"
import { createEffect, Show } from "solid-js"
import { createStore } from "solid-js/store"
import UserList from "@/components/UserList"
import Spinner from "@/components/Spinner"
import { User } from "@/types/api"
import { userApi } from "@/api/user"
import Modal from "../Modal"

type UserModalProps = {
    open: boolean
    onDismiss: () => void
    username: string
    type: "followers" | "following"
}

export function FollowModal(props: UserModalProps) {
    const navigate = useNavigate()

    const [state, setState] = createStore({
        page: 1,
        users: [] as User[],
        hasMore: true,
        loading: false,
    })

    // Fetch users for the current page
    const fetchUsers = async () => {
        setState("loading", true)
        let res
        if (props.type === "followers") {
            res = await userApi.getFollowers(props.username, false)
        } else {
            res = await userApi.getFollowing(props.username, false)
        }
        setState("loading", false)
        if (res.error) return
        if (res.ok.data.length === 0) setState("hasMore", false)
        setState("users", (prev) => [...prev, ...res.ok.data])
    }

    // Reset value every time is opened
    createEffect(() => {
        if (props.open) {
            setState({
                page: 1,
                users: [],
                hasMore: true,
                loading: false,
            })
            fetchUsers()
        }
    })

    // Scroll handler for infinite scroll
    const handleScroll = (e: Event) => {
        const el = e.target as HTMLDivElement
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120 && state.hasMore && !state.loading) {
            setState("page", state.page + 1)
            fetchUsers()
        }
    }

    return (
        <Modal show={props.open} onDismiss={props.onDismiss}>
            <button class="absolute top-4 right-4 text-xl cursor-pointer" onClick={props.onDismiss} aria-label="Close">
                ×
            </button>
            <p class="text-xl mb-4">{props.type === "followers" ? "Followers" : "Following"}</p>
            <div class="max-h-96 overflow-y-auto" onScroll={handleScroll}>
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
            </div>
        </Modal>
    )
}
