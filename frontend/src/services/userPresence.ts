import { userApi } from "@/api/user"

// https://discord.com/developers/docs/events/gateway-events#activity-object-activity-types
export type ActivityName = string
export type ActivityType = "reading"

export class UserActivityManager {
    static async setPresence(activity: ActivityType, name: ActivityName) {
        const res = await userApi.setUserPresence(activity, name)
        if (res.error) {
            console.log(res.error)
        }
    }
}
