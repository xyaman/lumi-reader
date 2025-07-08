import { Route, Router } from "@solidjs/router"
import BookLibrary from "@/BookLibrary"
import BookReader from "@/BookReader"
import Settings from "@/Settings"
import { getSelectedTheme, setGlobalTheme } from "./theme"
import Register from "./Register"
import Login from "./Login"
import Profile from "./Profile"
import UserSearch from "./SearchPage"
import { AuthProvider } from "./context/auth"

import { LibraryProvider } from "@/context/library"
import { WebSocketProvider } from "./context/websocket"

function App() {
    const theme = getSelectedTheme()
    setGlobalTheme(theme)

    return (
        <AuthProvider>
            <WebSocketProvider>
                <Router>
                    <Route
                        path="/"
                        component={() => (
                            <LibraryProvider>
                                <BookLibrary />
                            </LibraryProvider>
                        )}
                    />
                    <Route path="/reader/:id?" component={BookReader} />
                    <Route path="/settings" component={Settings} />
                    <Route path="/register" component={Register} />
                    <Route path="/login" component={Login} />
                    <Route path="/users/search" component={UserSearch} />
                    <Route path="/users/:id?" component={Profile} />
                </Router>
            </WebSocketProvider>
        </AuthProvider>
    )
}

export default App
