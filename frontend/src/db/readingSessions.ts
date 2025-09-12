import { LocalReadingSession, LumiDb } from "."

type IndexOptions = {
    synced?: boolean
    from?: Date
    to?: Date
    limit?: number
}

const readingSessions = {
    async create(event: Omit<LocalReadingSession, "snowflake" | "createdAt" | "updatedAt">) {
        const now = new Date()
        const snowflake = now.getTime()
        const createdAt = now
        const updatedAt = now
        return await LumiDb.readingSessions.add({ ...event, createdAt, updatedAt, snowflake })
    },

    async updateProgress(snowflake: number, progress: { charsRead: number; timeSpent: number }) {
        const payload = {
            ...progress,
            updatedAt: new Date(),
        }

        await LumiDb.readingSessions.update(snowflake, payload)
    },

    async index(options?: IndexOptions) {
        // TODO: improve the api to allow more flexibility
        const { synced, from, to, limit = 50 } = options || {}

        let table = LumiDb.readingSessions
        let collection

        if (synced !== undefined) {
            collection = table.where("synced").equals(synced ? 1 : 0)
        }

        if (from && to) {
            collection = table.where("createdAt").between(from, to, true, true)
        } else if (from) {
            collection = table.where("createdAt").aboveOrEqual(from)
        } else if (to) {
            collection = table.where("createdAt").belowOrEqual(to)
        }

        if (collection) {
            return await collection.reverse().limit(limit).toArray()
        } else {
            return await table.reverse().limit(limit).toArray()
        }
    },

    async delete(snowflake: number) {
        await LumiDb.readingSessions.update(snowflake, { status: "removed", synced: 0 })
    },

    async updateSyncedBatch(snowflakes: number[], status: boolean) {
        await LumiDb.transaction("rw", LumiDb.readingSessions, async () => {
            await LumiDb.readingSessions
                .where("snowflake")
                .anyOf(snowflakes)
                .modify({ synced: status ? 1 : 0 })
        })
    },
}

export default readingSessions
