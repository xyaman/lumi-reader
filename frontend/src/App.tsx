import { Route, Router } from "@solidjs/router"
import BookLibrary from "@/BookLibrary"
import BookReader from "@/BookReader"
import NewBookReader from "@/NewBookReader"
import Settings from "@/Settings"
import { getSelectedTheme, setGlobalTheme } from "./theme"

function App() {
    const theme = getSelectedTheme()
    setGlobalTheme(theme)

    return (
        <Router>
            <Route path="/" component={BookLibrary} />
            <Route path="/reader/:id?" component={BookReader} />
            <Route path="/nreader/:id?" component={NewBookReader} />
            <Route path="/settings" component={Settings} />
        </Router>
    )
}

export default App
