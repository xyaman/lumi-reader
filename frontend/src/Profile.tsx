import { createSignal, onMount } from "solid-js"
import { useParams } from "@solidjs/router"
import Navbar from "./components/Navbar"

function Profile() {
    const params = useParams()
    const viewedId = () => params.id || null

    const [user, setUser] = createSignal<{ id: string; username: string } | null>(null)
    const [shareReadingData, setShareReadingData] = createSignal<boolean | null>(null)
    const [shareUserStatus, setShareUserStatus] = createSignal<boolean | null>(null)
    const [isFollowing, setIsFollowing] = createSignal<boolean | null>(null)
    const [loading, setLoading] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)

    const isOwnProfile = () => viewedId() === null

    onMount(async () => {
        const localId = localStorage.getItem("user:id")

        try {
            const query = viewedId() ? `?id=${viewedId()}` : ""
            const res = await fetch(`http://localhost:3000/api/v1/me${query}`, {
                credentials: "include",
            })

            if (!res.ok) throw new Error("Failed to fetch profile")

            const data = await res.json()
            console.log("/me response:", data)
            setUser({ id: data.id, username: data.username })
            setShareReadingData(Boolean(data.share_reading_data))
            setShareUserStatus(Boolean(data.share_user_status))

            if (data.id !== localId) {
                const followRes = await fetch(`http://localhost:3000/following/${localId}`, {
                    credentials: "include",
                })
                const followData = await followRes.json()
                console.log(followData)
                const followingIds = followData.following.map((u: any) => String(u.id))
                setIsFollowing(followingIds.includes(String(data.id)))
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
            const newValue = !shareReadingData()
            const res = await fetch("http://localhost:3000/api/v1/update", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ share_reading_data: newValue }),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Update failed")
            }

            const updated = await res.json()
            setShareReadingData(Boolean(updated.share_reading_data))
        } catch (e: any) {
            setError(e.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    async function toggleShareUserStatus() {
        if (shareUserStatus() === null) return
        setLoading(true)
        setError(null)

        try {
            const newValue = !shareUserStatus()
            const res = await fetch("http://localhost:3000/api/v1/update", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ share_user_status: newValue }),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Update failed")
            }

            const updated = await res.json()
            setShareUserStatus(Boolean(updated.share_user_status))
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
            const method = isFollowing() ? "DELETE" : "POST"
            const res = await fetch(`http://localhost:3000/follows/${user()!.id}`, {
                method,
                credentials: "include",
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Follow action failed")
            }

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

                        {user() ? (
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

                                {isOwnProfile() ? (
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
                                ) : isFollowing() !== null ? (
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
                                ) : (
                                    <p class="text-gray-500">Loading follow status...</p>
                                )}

                                {error() && <p class="text-red-600 mt-2">{error()}</p>}
                            </div>
                        ) : (
                            <p class="text-[var(--base08)] text-center">No user info found.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Profile
