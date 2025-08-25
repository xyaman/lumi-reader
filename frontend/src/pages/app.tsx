import { MatchFilters, Route, Router } from "@solidjs/router"
import Settings from "@/Settings"
import { getSelectedTheme, setGlobalTheme } from "@/theme"
import UserSearch from "@/SearchPage"
import AuthProvider from "@/context/auth"

import SocialList from "@/components/SocialList"
import UserPage from "@/UserPage"

import { Login, Register } from "@/pages/auth"
import { Home, Library, ReadingSessions } from "@/pages/home"
import { BookReader } from "@/pages/reader"

const settingsFilter: MatchFilters = {
    name: ["theme", "reader", "sessions"],
}

export function App() {
    const theme = getSelectedTheme()
    setGlobalTheme(theme)

    return (
        <AuthProvider>
            <Router>
                <Route path="/" component={Home}>
                    <Route path="/" component={Library} />
                    <Route path="/sessions" component={ReadingSessions} />
                    <Route path="/social" component={SocialList} />
                    <Route path="/users/:id?" component={UserPage} />
                </Route>
                <Route path="/reader/:id?" component={BookReader} matchFilters={settingsFilter} />
                <Route path="/settings/:name?" component={Settings} />
                <Route path="/register" component={Register} />
                <Route path="/login" component={Login} />
                <Route path="/users/search" component={UserSearch} />
            </Router>
        </AuthProvider>
    )
}
