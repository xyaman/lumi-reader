import { createEffect, createResource, Show } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import UserList from "@/components/UserList"
import Navbar from "@/components/Navbar"
import api from "@/lib/api"

type Props = {
    mode: "followers" | "following"
}

export default function FollowListPage(props: Props) {
    const navigate = useNavigate()
    const params = useParams()
    const id = Number(params.id)
    if (!id) {
        navigate("/home", { replace: true })
    }

    const [users] = createResource(async () => {
        return props.mode === "followers"
            ? (await api.fetchUserFollowers(id)).followers
            : (await api.fetchUserFollows(id)).following
    })

    createEffect(() => {
        if (users.error) {
            navigate("/home", { replace: true })
        }
    })

    const handleUserClick = (userId: number) => {
        navigate(`/users/${userId}`)
    }

    return (
        <>
            <Navbar>
                <Navbar.Left>
                    <a
                        class="text-xl font-bold hover:text-[var(--base0D)] transition-colors"
                        onClick={() => navigate(-1)}
                    >
                        ← Go back
                    </a>
                    <h1 class="ml-4 text-xl font-semibold capitalize">{props.mode}</h1>
                </Navbar.Left>
            </Navbar>

            <div class="mt-4 mx-auto max-w-4xl">
                <Show
                    when={!users.loading}
                    fallback={<p class="text-center text-gray-500">Loading...</p>}
                >
                    <Show
                        when={users() && users()!.length > 0}
                        fallback={<p class="text-center text-gray-500">No users found.</p>}
                    >
                        <UserList users={users()!} onUserClick={handleUserClick} />
                    </Show>
                </Show>
            </div>
        </>
    )
}
