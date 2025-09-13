import { useNavigate } from "@solidjs/router"
import { createEffect, createSignal, Show } from "solid-js"

import { authApi } from "@/api/auth"
import { IconPatreon } from "@/components/icons"
import { useAuthDispatch, useAuthState } from "@/context/auth"
import { Button } from "@/ui/button"
import { Checkbox } from "@/ui"
import { userApi } from "@/api/user"

export function AccountSettings() {
    const authState = useAuthState()
    const authDispatch = useAuthDispatch()
    const [shareUserPresence, setShareUserPresence] = createSignal(false)
    const [shareReadingSessions, setShareReadingSessions] = createSignal(false)

    createEffect(() => {
        if (authState.user) {
            setShareUserPresence(authState.user.sharePresence)
            setShareReadingSessions(authState.user.shareReadingSessions)
        }
    })

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

    const handleShareUserPresence = async () => {
        const res = await userApi.update({ sharePresence: !shareUserPresence() })
        if (res.error) return console.error(res.error)
        setShareUserPresence(!shareUserPresence())
        await authDispatch.refreshCurrentUser()
    }

    const handleShareReadingSessions = async () => {
        const res = await userApi.update({ shareReadingSessions: !shareReadingSessions() })
        if (res.error) return console.error(res.error)
        setShareReadingSessions(!shareReadingSessions())
        await authDispatch.refreshCurrentUser()
    }

    createEffect(() => {
        if (authState.status === "unauthenticated") {
            const navigate = useNavigate()
            navigate("/login")
        }
    })

    return (
        <section>
            <h2 class="text-2xl font-semibold">Account Settings</h2>
            <div class="mt-4 space-y-10">
                <div>
                    <h3 class="text-lg font-medium">Patreon Integration</h3>
                    <div class="mt-4 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <IconPatreon />
                            </div>
                            <div>
                                <p class="font-semibold">Patreon Status</p>
                                <p class="text-sm text-muted-foreground">
                                    <Show when={authState.user?.isPatreonLinked} fallback={"Not Linked"}>
                                        Linked
                                    </Show>
                                </p>
                            </div>
                        </div>
                        <Show
                            when={!authState.user?.isPatreonLinked}
                            fallback={
                                <div class="flex gap-2">
                                    <Button onClick={handleUnlink}>Unlink</Button>
                                    <Button onClick={handleRefresh}>Refresh</Button>
                                </div>
                            }
                        >
                            <Button onClick={handleLink}>Link Patreon</Button>
                        </Show>
                    </div>
                </div>

                <div>
                    <h3 class="text-lg font-medium">Privacy</h3>
                    <div class="mt-2 space-y-4">
                        <div class="flex items-center space-x-2">
                            <Checkbox checked={shareUserPresence()} onChange={handleShareUserPresence} />
                            <span>Share user presence</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <Checkbox checked={shareReadingSessions()} onChange={handleShareReadingSessions} />
                            <span>Share reading sessions</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
