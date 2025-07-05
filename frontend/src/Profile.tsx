import { Show, createSignal, onMount } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import Navbar from "./components/Navbar"
import api from "./lib/api"
import { useAuthContext } from "./context/auth"

function Profile() {
    const { authStore } = useAuthContext()
    const navigate = useNavigate()
    const params = useParams()

    if (!params.id && !authStore.user) {
        navigate("/login")
    }

    const viewedId = () => Number(params.id ?? authStore.user!.id)

    const [user, setUser] = createSignal<{ id: number; username: string } | null>(null)
    const [shareReadingData, setShareReadingData] = createSignal<boolean>(true)
    const [isFollowing, setIsFollowing] = createSignal<boolean | null>(null)
    const [loading, setLoading] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)

    const isOwnProfile = () => viewedId() === authStore.user?.id

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
        if (shareReadingData() === null) return
        setLoading(true)
        setError(null)

        try {
            //     const newValue = !shareReadingData()
            //     const res = await fetch("http://localhost:3000/api/v1/update", {
            //         method: "PUT",
            //         headers: {
            //             "Content-Type": "application/json",
            //         },
            //         credentials: "include",
            //         body: JSON.stringify({ share_reading_data: newValue }),
            //     })
            //
            //     if (!res.ok) {
            //         const errData = await res.json()
            //         throw new Error(errData.error || "Update failed")
            //     }
            //
            //     const updated = await res.json()
            //     setShareReadingData(Boolean(updated.share_reading_data))
            // } catch (e: any) {
            // setError(e.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    async function toggleFollow() {
        if (!user()) return
        setLoading(true)
        setError(null)

        try {
            if (isFollowing()) throw new Error()

            await api.follow(viewedId())

            setIsFollowing(!isFollowing())
        } catch (e: any) {
            setError(e.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Navbar>
                <Navbar.Left>Profile</Navbar.Left>
            </Navbar>
            <div class="h-screen bg-[var(--base00)] text-[var(--base05)]">
                <div class="h-full flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div class="w-full max-w-md space-y-8 bg-[var(--base01)] p-8 rounded shadow">
                        <h2 class="text-center text-3xl font-extrabold text-[var(--base07)]">
                            Profile
                        </h2>

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
                                    <span class="font-semibold text-[var(--base0D)]">
                                        Username:
                                    </span>
                                    <span class="ml-2">{user()!.username}</span>
                                </div>

                                <Show
                                    when={isOwnProfile()}
                                    fallback={
                                        <Show
                                            when={isFollowing() !== null}
                                            fallback={
                                                <p class="text-gray-500">
                                                    Loading follow status...
                                                </p>
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
        </>
    )
}

export default Profile
