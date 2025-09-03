import { MatchFilters, Route, Router } from "@solidjs/router"
import { getSelectedTheme, setGlobalTheme } from "@/lib/theme"
import AuthProvider from "@/context/auth"

import SocialList from "@/components/SocialList"

import { Login, Register } from "@/pages/auth"
import { Home, Library, ReadingSessions, SyncBooks } from "@/pages/home"
import { Settings } from "@/pages/settings"
import { Users, BookReader } from "@/pages"

const settingsFilter: MatchFilters = {
    name: ["theme", "reader", "sessions", "account"],
}

export function App() {
    const theme = getSelectedTheme()
    setGlobalTheme(theme)

    return (
        <AuthProvider>
            <Router>
                <Route path="/" component={Home}>
                    <Route path="/" component={Library} />
                    <Route path="/syncbooks" component={SyncBooks} />
                    <Route path="/sessions" component={ReadingSessions} />
                    <Route path="/social" component={SocialList} />
                    <Route path="/me" component={Users} />
                    <Route path="/users/:username" component={Users} />
                </Route>
                <Route path="/reader/:id?" component={BookReader} />
                <Route path="/settings/:name?" component={Settings} matchFilters={settingsFilter} />
                <Route path="/register" component={Register} />
                <Route path="/login" component={Login} />
                {/* <Route path="/users/search" component={UserSearch} /> */}
            </Router>
        </AuthProvider>
    )
}
