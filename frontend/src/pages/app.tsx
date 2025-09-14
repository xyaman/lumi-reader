import { MatchFilters, Route, Router } from "@solidjs/router"
import { getSelectedTheme, setGlobalTheme } from "@/lib/theme"
import AuthProvider from "@/context/auth"

import SocialList from "@/components/SocialList"

import { Login, Register } from "@/pages/auth"
import { Home, Library, ReadingSessions, SyncBooks, PatreonTiers } from "@/pages/home"
import { Settings } from "@/pages/settings"
import { Users, BookReader } from "@/pages"
import { Toaster } from "solid-toast"

const settingsFilter: MatchFilters = {
    name: ["theme", "reader", "sessions", "account", "about"],
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
                    <Route path="/patreon" component={PatreonTiers} />
                </Route>
                <Route path="/reader/:id?" component={BookReader} />
                <Route path="/settings/:name?" component={Settings} matchFilters={settingsFilter} />
                <Route path="/register" component={Register} />
                <Route path="/login" component={Login} />
                {/* <Route path="/users/search" component={UserSearch} /> */}
            </Router>
            <Toaster />
        </AuthProvider>
    )
}
