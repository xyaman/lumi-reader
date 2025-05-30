import { Route, Router } from "@solidjs/router"
import BookLibrary from "./BookLibrary"
import BookReader from "./BookReader"
import Settings from "./Settings"

function App() {
    return (
        <Router>
            <Route path="/" component={BookLibrary} />
            <Route path="/reader/:id?" component={BookReader} />
            <Route path="/settings" component={Settings} />
        </Router>
    )
}

export default App
