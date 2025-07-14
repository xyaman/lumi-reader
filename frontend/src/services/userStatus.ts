import api from "@/lib/api"

// https://discord.com/developers/docs/events/gateway-events#activity-object-activity-types
export type ActivityName = string
export type ActivityType = "reading"

export class UserActivityManager {
    static async setPresence(name: ActivityName, activity: ActivityType) {
        await api.updateCurrentUserStatus(activity)
    }
}
