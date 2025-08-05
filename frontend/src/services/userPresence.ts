import { userApi } from "@/api/user"
import { useAuthState } from "@/context/auth"

// https://discord.com/developers/docs/events/gateway-events#activity-object-activity-types
export type ActivityName = string
export type ActivityType = "reading"

export class UserActivityManager {
    static async setPresence(activity: ActivityType, name: ActivityName) {
        const authState = useAuthState()
        if (authState.status != "unauthenticated" || !navigator.onLine) return

        const res = await userApi.setUserPresence(activity, name)
        if (res.error) {
            console.log(res.error)
        }
    }
}
