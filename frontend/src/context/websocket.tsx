import {
    createContext,
    useContext,
    onCleanup,
    ParentComponent,
    createEffect,
    createSignal,
} from "solid-js"
import { createWebSocketStore, type WebSocketStore } from "@/stores/websocket"
import api, { type PartialUser } from "@/lib/api"

type WebSocketContextType = {
    websocket: WebSocketStore
    following: () => PartialUser[]
    fetchSessions: () => Promise<void>
}
const WebSocketContext = createContext<WebSocketContextType>()

export const WebSocketProvider: ParentComponent = (props) => {
    const webSocketStore = createWebSocketStore()
    const [sortedUsers, setSortedUsers] = createSignal<PartialUser[]>([])

    const fetchSessions = async () => {
        const res = await api.fetchUserStatusBatch(webSocketStore.store.filteredUserIds)
        res.results.forEach((u) => {
            webSocketStore.setStore("userStatuses", u.user_id, { ...u, id: u.user_id })
        })
    }

    // always sort by online/offline whenever the store changes
    createEffect(() => {
        const users = Object.values(webSocketStore.store.userStatuses).sort((a, b) => {
            if (a.online === b.online && a.timestamp && b.timestamp) {
                return b.timestamp - a.timestamp
            }
            return (b.online ? 1 : 0) - (a.online ? 1 : 0)
        })

        setSortedUsers(users)
    })

    onCleanup(() => {
        webSocketStore.destroyConnection()
    })

    return (
        <WebSocketContext.Provider
            value={{ websocket: webSocketStore, following: sortedUsers, fetchSessions }}
        >
            {props.children}
        </WebSocketContext.Provider>
    )
}

export const useWebSocket = () => {
    const context = useContext(WebSocketContext)
    if (!context) {
        throw new Error("useWebSocket must be used within a WebSocketProvider")
    }
    return context
}
