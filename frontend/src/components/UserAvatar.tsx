import { User } from "@/types/api"
import { Show } from "solid-js"

type UserAvatarProps = {
    user: User
    w: number
    h: number
    onAvatarChange?: (f: File) => void
    isCurrentUser?: boolean
}

export default function UserAvatar(props: UserAvatarProps) {
    const mobileW = props.w * 0.8
    const mobileH = props.h * 0.8

    // same behaviour than tailwind
    const style = `
        width: calc(var(--spacing) * ${mobileW});
        height: calc(var(--spacing) * ${mobileH});
        @media (min-width: 768px) {
            width: calc(var(--spacing) * ${props.w});
            height: calc(var(--spacing) * ${props.h});
        }
    `
    return (
        <div class="relative">
            <Show
                when={props.user.avatarUrl}
                fallback={
                    <div class="bg-base01 rounded-full flex items-center justify-center" style={style}>
                        <span class="text-xs font-medium">{props.user.username.charAt(0).toUpperCase()}</span>
                    </div>
                }
            >
                <div class="rounded-full overflow-hidden border-2 border-base04" style={style}>
                    <img class="w-full h-full object-cover" src={props.user.avatarUrl} alt="User avatar" />
                </div>
            </Show>
            <Show when={props.onAvatarChange && props.isCurrentUser}>
                <label class="absolute rounded bottom-0 right-0 text-xs px-2 py-1 cursor-pointer bg-base02 hover:bg-base03">
                    Change
                    <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        onChange={(e) => {
                            const file = e.currentTarget.files?.[0]
                            if (file) props.onAvatarChange!(file)
                        }}
                    />
                </label>
            </Show>
        </div>
    )
}
