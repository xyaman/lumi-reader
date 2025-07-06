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

function App() {
    const theme = getSelectedTheme()
    setGlobalTheme(theme)

    return (
        <AuthProvider>
            <Router>
                <Route path="/" component={BookLibrary} />
                <Route path="/reader/:id?" component={BookReader} />
                <Route path="/settings" component={Settings} />
                <Route path="/register" component={Register} />
                <Route path="/login" component={Login} />
                <Route path="/profile/search" component={UserSearch} />
                <Route path="/profile/:id?" component={Profile} />
            </Router>
        </AuthProvider>
    )
}

export default App
