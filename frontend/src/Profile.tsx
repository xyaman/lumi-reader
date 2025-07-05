import { Show, createSignal, onMount } from "solid-js"
import { useNavigate, useParams, A } from "@solidjs/router"
import Navbar from "./components/Navbar"
import api from "./lib/api"
import { useAuthContext } from "./context/auth"
import { IconSettings, IconExit } from "@/components/icons"

function Profile() {
    const { authStore } = useAuthContext()
    const navigate = useNavigate()
    const params = useParams()
    const logout = () => {}

    const [user, setUser] = createSignal<{ id: number; username: string } | null>(null)
    const [shareReadingData, setShareReadingData] = createSignal<boolean>(true)
    const [isFollowing, setIsFollowing] = createSignal<boolean | null>(null)
    const [loading, setLoading] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)
    const [search, setSearch] = createSignal("")

    const viewedId = () => Number(params.id ?? authStore.user?.id)
    const isOwnProfile = () => viewedId() === authStore.user?.id

    if (!params.id && !authStore.user) {
        navigate("/login")
    }

    onMount(async () => {
        try {
            const data = await api.fetchProfileInfo(viewedId())
            setUser({ id: data.user.id, username: data.user.username })
            setShareReadingData(Boolean(data.user.share_reading_data))

            if (!isOwnProfile()) {
                const follows = await api.fetchUserFollows(data.user.id)
                const followingIds = follows.following.map((u: any) => String(u.id))
                setIsFollowing(followingIds.includes(String(data.user.id)))
            }
        } catch (e: any) {
            console.error(e)
            setError("Failed to load profile")
        }
    })

    async function toggleShareReading() {
        setLoading(true)
        setError(null)
        try {
            // const newValue = !shareReadingData()
            // await api.updateSettings({ share_reading_data: newValue })
            // setShareReadingData(newValue)
        } catch (e: any) {
            setError(e.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    async function toggleFollow() {
        if (!user()) return
        setLoading(true)
        setError(null)

        try {
            if (isFollowing()) throw new Error("Already following")
            await api.follow(viewedId())
            setIsFollowing(!isFollowing())
        } catch (e: any) {
            setError(e.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    function handleSearchSubmit(e: Event) {
        e.preventDefault()
        if (search().trim()) {
            navigate(`/users?query=${encodeURIComponent(search())}`)
        }
    }

    return (
        <div class="min-h-screen bg-[var(--base00)] text-[var(--base05)] flex flex-col">
            {/* Navbar */}
            <Navbar fixed>
                <Navbar.Left>
                    <A
                        href="/"
                        class="text-xl font-bold text-[var(--base07)] hover:text-[var(--base0D)] transition-colors"
                    >
                        ← lumireader
                    </A>

                    <form onSubmit={handleSearchSubmit} class="flex items-center gap-2">
                        <input
                            type="text"
                            class="px-3 py-1 rounded-md bg-[var(--base01)] border border-[var(--base03)] text-[var(--base05)] placeholder-[var(--base04)] focus:outline-none focus:ring-2 focus:ring-[var(--base0D)]"
                            placeholder="Search users..."
                            value={search()}
                            onInput={(e) => setSearch(e.currentTarget.value)}
                        />
                        <button
                            type="submit"
                            class="px-3 py-1 rounded-md bg-[var(--base0D)] text-[var(--base00)] font-medium hover:bg-[var(--base0C)] transition"
                        >
                            Search
                        </button>
                    </form>
                </Navbar.Left>

                <Navbar.Right>
                    <A href="/settings" class="button-theme px-3 py-2 rounded-lg">
                        <IconSettings />
                    </A>
                    <button
                        onClick={logout}
                        class="button-theme px-3 py-2 rounded-lg flex items-center gap-1"
                    >
                        <IconExit />
                        <span class="hidden sm:inline">Logout</span>
                    </button>
                </Navbar.Right>
            </Navbar>

            {/* Profile Content */}
            <div class="flex-1 flex items-center justify-center px-4 mt-8">
                <div class="w-full max-w-md space-y-6 bg-[var(--base01)] p-6 rounded-2xl shadow-lg">
                    <h2 class="text-3xl font-bold text-center text-[var(--base07)]">Profile</h2>

                    <Show
                        when={user()}
                        fallback={
                            <p class="text-[var(--base08)] text-center">No user info found.</p>
                        }
                    >
                        <div class="space-y-4">
                            <div>
                                <span class="font-semibold text-[var(--base0D)]">ID:</span>
                                <span class="ml-2">{user()!.id}</span>
                            </div>
                            <div>
                                <span class="font-semibold text-[var(--base0D)]">Username:</span>
                                <span class="ml-2">{user()!.username}</span>
                            </div>

                            <Show
                                when={isOwnProfile()}
                                fallback={
                                    <Show
                                        when={isFollowing() !== null}
                                        fallback={
                                            <p class="text-gray-500">Loading follow status...</p>
                                        }
                                    >
                                        <button
                                            class="mt-4 px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
                                            disabled={loading()}
                                            onClick={toggleFollow}
                                        >
                                            {loading()
                                                ? "Processing..."
                                                : isFollowing()
                                                  ? "Unfollow"
                                                  : "Follow"}
                                        </button>
                                    </Show>
                                }
                            >
                                <>
                                    <div>
                                        <span class="font-semibold text-[var(--base0D)]">
                                            Share Reading Data:
                                        </span>
                                        <span class="ml-2">
                                            {shareReadingData() === null
                                                ? "Loading..."
                                                : shareReadingData()
                                                  ? "Yes"
                                                  : "No"}
                                        </span>
                                    </div>
                                    <button
                                        class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                                        disabled={loading()}
                                        onClick={toggleShareReading}
                                    >
                                        {loading()
                                            ? "Updating..."
                                            : shareReadingData()
                                              ? "Disable Sharing"
                                              : "Enable Sharing"}
                                    </button>
                                </>
                            </Show>

                            <Show when={error()}>
                                <p class="text-red-600 mt-2">{error()}</p>
                            </Show>
                        </div>
                    </Show>
                </div>
            </div>
        </div>
    )
}

export default Profile
