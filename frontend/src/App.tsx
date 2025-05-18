import { Route, Router } from "@solidjs/router"
import BookLibrary from "./BookLibrary"
import BookReader from "./BookReader"

function App() {
    return (
        <Router>
            <Route path="/" component={BookLibrary} />
            <Route path="/reader/:id?" component={BookReader} />
        </Router>
    )
}

export default App
