import { createContext, useContext, onCleanup, ParentComponent } from "solid-js"
import { createWebSocketStore, type WebSocketStore } from "@/stores/websocket"

const WebSocketContext = createContext<WebSocketStore>()

export const WebSocketProvider: ParentComponent = (props) => {
    const webSocketStore = createWebSocketStore()

    onCleanup(() => {
        webSocketStore.destroyConnection()
    })

    return (
        <WebSocketContext.Provider value={webSocketStore}>
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
