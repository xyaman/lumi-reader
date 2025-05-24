import { useNavigate } from "@solidjs/router"
import { createSignal, onMount } from "solid-js"

export default function Settings() {
    const [paginated, setPaginated] = createSignal(true)
    const [vertical, setVertical] = createSignal(false)
    const navigate = useNavigate()

    onMount(() => {
        const storedPaginated = localStorage.getItem("reader:paginated")
        const storedVertical = localStorage.getItem("reader:vertical")

        if (storedPaginated !== null) setPaginated(storedPaginated === "true")
        if (storedVertical !== null) setVertical(storedVertical === "true")
    })

    const saveSettings = () => {
        localStorage.setItem("reader:paginated", String(paginated()))
        localStorage.setItem("reader:vertical", String(vertical()))
        alert("settings saved")
        navigate("/")
    }

    return (
        <div class="p-8 space-y-4">
            <h1 class="text-2xl font-bold">Reader Settings</h1>
            <div>
                <label class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={paginated()}
                        onInput={(e) => setPaginated(e.currentTarget.checked)}
                    />
                    Enable Pagination
                </label>
            </div>
            <div>
                <label class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={vertical()}
                        onInput={(e) => setVertical(e.currentTarget.checked)}
                    />
                    Vertical Text Mode
                </label>
            </div>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveSettings}>
                Save
            </button>
        </div>
    )
}
