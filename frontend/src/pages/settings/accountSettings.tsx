import { authApi } from "@/api/auth"
import { IconPatreon } from "@/components/icons"
import { useAuthDispatch, useAuthState } from "@/context/auth"
import { Button } from "@/ui/button"
import { Show } from "solid-js"

export function AccountSettings() {
    const authState = useAuthState()
    const authDispatch = useAuthDispatch()

    const handleLink = async () => {
        const res = await authApi.generatePatreonUrl()
        if (res.error) {
            return console.error(res.error)
        }
        window.location.href = res.ok.data
    }

    const handleUnlink = async () => {
        const res = await authApi.unlinkPatreon()
        if (res.error) {
            return console.error(res.error)
        }
        await authDispatch.refreshCurrentUser()
    }

    const handleRefresh = async () => {
        const res = await authApi.refreshPatreon()
        if (res.error) {
            return console.error(res.error)
        }
        await authDispatch.refreshCurrentUser()
    }

    return (
        <section>
            <h2 class="text-2xl font-semibold">Account Settings</h2>
            <Show when={authState.status === "authenticated"} fallback={<p>You must login.</p>}>
                <div class="mt-4 flex gap-2">
                    <Show when={!authState.user?.isPatreonLinked}>
                        <Button
                            onClick={handleLink}
                            classList={{ "bg-[#FF424D] hover:bg-[#e23c46] text-white flex items-center gap-2": true }}
                        >
                            <IconPatreon />
                            Link Patreon
                        </Button>
                    </Show>
                    <Show when={authState.user?.isPatreonLinked}>
                        <Button
                            onClick={handleUnlink}
                            classList={{ "bg-gray-200 hover:bg-gray-300 text-black flex items-center gap-2": true }}
                        >
                            <IconPatreon />
                            Unlink Patreon
                        </Button>
                        <Button
                            onClick={handleRefresh}
                            classList={{ "bg-[#FF424D] hover:bg-[#e23c46] text-white flex items-center gap-2": true }}
                        >
                            <IconPatreon />
                            Force Refresh
                        </Button>
                    </Show>
                </div>
            </Show>
        </section>
    )
}
