import { createStore } from "solid-js/store"
import { createConsumer } from "@rails/actioncable"

const WS_URL = import.meta.env.PROD ? "wss://api.lumireader.app/cable" : "ws://localhost:3000/cable"

export interface UserStatus {
    user_id: number
    online: boolean
    last_activity?: string
    timestamp: number
}

interface UserStatusStore {
    userStatuses: Record<number, UserStatus>
    isConnected: boolean
    error: string | null
    filteredUserIds: number[]
}

export function createWebSocketStore() {
    const [store, setStore] = createStore<UserStatusStore>({
        userStatuses: {},
        isConnected: false,
        error: null,
        filteredUserIds: [],
    })

    // ActionCable consumer and channel references
    let consumer: any = null
    let userStatusChannel: any = null
    let heartbeatInterval: number | null = null

    // Start heartbeat to keep connection alive
    const startHeartbeat = () => {
        stopHeartbeat()
        heartbeatInterval = setInterval(() => {
            console.log("Sending heartbeat...")
            sendHeartbeat()
        }, 30000) // Send heartbeat every 30 seconds
    }

    // Stop heartbeat interval
    const stopHeartbeat = () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
        }
    }

    // Initialize ActionCable connection
    const initializeConnection = () => {
        if (consumer) {
            console.log("Consumer already exists, skipping initialization")
            return
        }

        try {
            consumer = createConsumer(WS_URL)
            userStatusChannel = consumer.subscriptions.create(
                { channel: "UserStatusChannel" },
                {
                    connected() {
                        console.log("Status websocket connected")
                        setStore("isConnected", true)
                        setStore("error", null)
                        startHeartbeat()
                    },
                    disconnected() {
                        console.log("Status websocket disconnected")
                        setStore("isConnected", false)
                        stopHeartbeat()
                    },
                    received(payload: any) {
                        console.log("Received payload:", payload)
                        // TODO: handle more payloads
                        if (payload && typeof payload === "object" && "user_id" in payload) {
                            const userStatus = payload as UserStatus
                            setStore("userStatuses", userStatus.user_id, userStatus)
                        }
                    },
                    rejected() {
                        console.log("Status websocket connection rejected")
                        setStore("error", "WebSocket connection rejected")
                        setStore("isConnected", false)
                    },
                },
            )
        } catch (error) {
            console.error("WebSocket initialization error:", error)
            setStore(
                "error",
                `Connection error: ${error instanceof Error ? error.message : "Unknown error"}`,
            )
        }
    }

    // Clean up connection and resources
    const destroyConnection = () => {
        stopHeartbeat()

        if (userStatusChannel) {
            userStatusChannel.unsubscribe()
            userStatusChannel = null
        }

        if (consumer) {
            consumer.disconnect()
            consumer = null
        }

        setStore("isConnected", false)
    }

    const connect = () => {
        console.log("WebSocket connect() called")
        initializeConnection()
    }

    const disconnect = () => {
        console.log("WebSocket disconnect() called")
        destroyConnection()
    }

    // Only updates from users in this filter will be received by the client
    const updateFilter = (userIds: number[]) => {
        if (userStatusChannel) {
            userStatusChannel.perform("update_filter", { user_ids: userIds })
            setStore("filteredUserIds", userIds)
        } else {
            console.warn("Cannot update filter: no active channel")
        }
    }

    // Send heartbeat to maintain connection
    const sendHeartbeat = () => {
        if (userStatusChannel) {
            userStatusChannel.perform("heartbeat")
        }
    }

    return {
        store,
        connect,
        disconnect,
        updateFilter,
        sendHeartbeat,
        destroyConnection,
    }
}

export type WebSocketStore = ReturnType<typeof createWebSocketStore>
