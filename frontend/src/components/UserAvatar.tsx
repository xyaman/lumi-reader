import { User } from "@/types/api"
import { Show } from "solid-js"

export default function UserAvatar(props: { user: User; w: number; h: number }) {
    const mobileW = props.w * 0.8
    const mobileH = props.h * 0.8

    const style = `
        width: calc(var(--spacing) * ${mobileW});
        height: calc(var(--spacing) * ${mobileH});
        @media (min-width: 768px) {
            width: calc(var(--spacing) * ${props.w});
            height: calc(var(--spacing) * ${props.h});
        }
    `
    return (
        <Show
            when={props.user.avatarUrl}
            fallback={
                <div class="bg-base01 rounded-full flex items-center justify-center" style={style}>
                    <span class="text-xs font-medium">
                        {props.user.username.charAt(0).toUpperCase()}
                    </span>
                </div>
            }
        >
            <div class="rounded-full overflow-hidden border-2 border-base04" style={style}>
                <img
                    class="w-full h-full object-cover"
                    src={props.user.avatarUrl}
                    alt="User avatar"
                />
            </div>
        </Show>
    )
}
