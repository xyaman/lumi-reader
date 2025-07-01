import { createSignal, onMount } from "solid-js"
import Navbar from "./components/Navbar"

function Profile() {
    const [user, setUser] = createSignal<{ id: string; username: string } | null>(null)

    onMount(async () => {
        const id = localStorage.getItem("user:id")
        const username = localStorage.getItem("user:username")
        if (id && username) setUser({ id, username })
        try {
            const res = await fetch("http://localhost:3000/current_user", {
                credentials: "include",
            })
            const data = await res.json()
            console.log("/current_user response:", data)
        } catch (e) {
            console.log("/current_user error:", e)
        }
    })

    return (
        <>
            <Navbar>
                <Navbar.Left>Profile</Navbar.Left>
            </Navbar>
            <div class="h-screen m-aubg-[var(--base00)] text-[var(--base05)]">
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
