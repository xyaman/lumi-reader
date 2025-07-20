import { User } from "@/types/api"
import { Show } from "solid-js"

export default function UserAvatar(props: { user: User; w: number; h: number }) {
    const mobileW = props.w * 0.8
    const mobileH = props.h * 0.8

    const sizeClass = `w-${mobileW} h-${mobileH} md:w-${props.w} md:h-${props.h}`

    return (
        <Show
            when={props.user.avatarUrl}
            fallback={
                <div class={`${sizeClass} bg-base01 rounded-full flex items-center justify-center`}>
                    <span class="text-xs font-medium">
                        {props.user.username.charAt(0).toUpperCase()}
                    </span>
                </div>
            }
        >
            <div class={`${sizeClass} rounded-full overflow-hidden border-2 border-base04`}>
                <img
                    class="w-full h-full object-cover"
                    src={props.user.avatarUrl}
                    alt="User avatar"
                />
            </div>
        </Show>
    )
}
