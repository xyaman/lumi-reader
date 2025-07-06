import { createSignal, createResource, Show } from "solid-js"
import { useNavigate } from "@solidjs/router"
import UserList, { SimpleUser } from "@/components/UserList"
import api from "./lib/api"
import Navbar from "./components/Navbar"

export default function UserListPage() {
    const navigate = useNavigate()
    const [query, setQuery] = createSignal("")
    const [searchTerm, setSearchTerm] = createSignal("")

    // Fetch users only when searchTerm changes (on Enter)
    const [users] = createResource(searchTerm, async (q) => {
        if (!q) return []
        const res = await api.fetchUsersByQuery(q)
        return res.users as SimpleUser[]
    })

    const handleUserClick = (userId: number) => {
        navigate(`/profile/${userId}`)
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            setSearchTerm(query())
        }
    }

    return (
        <>
            {/* Simple Navbar */}
            <Navbar>
                <Navbar.Left>
                    <a
                        class="text-xl font-bold hover:text-[var(--base0D)] transition-colors"
                        onClick={() => navigate(-1)}
                    >
                        ← Go back
                    </a>
                    <h1 class="ml-4 text-xl font-semibold">Users</h1>
                </Navbar.Left>
            </Navbar>

            <div class="mt-4 mx-auto max-w-4xl">
                {/* Search Input */}
                <div class="mb-4">
                    <input
                        type="text"
                        placeholder="Search users..."
                        class="w-full p-2 rounded border"
                        value={query()}
                        onInput={(e) => setQuery(e.currentTarget.value)}
                        onKeyDown={onKeyDown}
                        aria-label="Search users"
                    />
                </div>

                {/* User List */}
                <Show
                    when={!users.loading}
                    fallback={<p class="text-center text-gray-500">Loading users...</p>}
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
