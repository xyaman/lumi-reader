import { createMemo } from "solid-js"
import { User } from "@/types/api"
import UserAvatar from "./UserAvatar"
import Popover from "@corvu/popover"
import { useAuthDispatch } from "@/context/auth"
import { userApi } from "@/api/user"
import { errorToast } from "@/ui"

type UserStatusProps = {
    user: User
    w: number
    h: number
}

export default function UserStatus(props: UserStatusProps) {
    const authDispatch = useAuthDispatch()

    const online = createMemo(() => props.user.shareOnlineStatus)

    const setOnline = async (b: boolean) => {
        const res = await userApi.update({ shareOnlineStatus: b })
        if (res.error) return errorToast(res.error.message)
        await authDispatch.refreshCurrentUser()
    }

    return (
        <div class="relative">
            <UserAvatar h={props.h} w={props.w} user={props.user} />
            <div
                class={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${online() ? "bg-base0B" : "bg-base04"}`}
            />

            <Popover floatingOptions={{ offset: 5, flip: true, shift: true }}>
                <Popover.Trigger
                    class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full cursor-pointer"
                    classList={{
                        "bg-base0B": online(),
                        "bg-base08": !online(),
                    }}
                    onClick={(e) => e.stopPropagation()}
                />

                <Popover.Portal>
                    <Popover.Content
                        class="z-50 top-full right-0 mt-2 w-max bg-base01 border border-base02 rounded-md shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ul class="py-1">
                            <li>
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-base05 hover:bg-base02"
                                    onClick={() => setOnline(true)}
                                >
                                    Online
                                </button>
                            </li>
                            <li>
                                <button
                                    class="block w-full text-left px-4 py-2 text-sm text-base05 hover:bg-base02"
                                    onClick={() => setOnline(false)}
                                >
                                    Offline
                                </button>
                            </li>
                        </ul>
                        <Popover.Arrow class="text-base01" />
                    </Popover.Content>
                </Popover.Portal>
            </Popover>
        </div>
    )
}
