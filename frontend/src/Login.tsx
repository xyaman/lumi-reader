import { createEffect, createSignal, Show } from "solid-js"
import { A, useLocation, useNavigate } from "@solidjs/router"
import api from "./lib/api"
import Navbar from "./components/Navbar"
import { useAuthContext } from "./context/auth"

function Login() {
    const { authStore, fetchCurrentUser } = useAuthContext()
    const location = useLocation()
    const [email, setEmail] = createSignal("")
    const [password, setPassword] = createSignal("")
    const [error, setError] = createSignal("")
    const [statusMsg, setStatusMsg] = createSignal("")

    createEffect(() => {
        if (authStore.user) {
            const navigate = useNavigate()
            navigate("/users", { replace: true })
            return
        }
        fetchCurrentUser()
    })

    createEffect(() => {
        const params = new URLSearchParams(location.search)
        const status = params.get("status")
        if (status === "already_confirmed") {
            setStatusMsg("Email already confirmed.")
        } else if (status === "invalid_token") {
            setStatusMsg("Invalid or expired confirmation link.")
        } else if (status === "confirmed") {
            setStatusMsg("Email confirmed! You can now log in.")
        } else {
            setStatusMsg("")
        }
    })

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        setError("")
        try {
            const body = {
                email: email(),
                password: password(),
            }
            await api.login(body)
            await fetchCurrentUser()
        } catch (e: unknown) {
            if (typeof e === "string") {
                setError(e)
            } else if (e instanceof Error) {
                setError(e.message)
            }
        }
    }

    return (
        <div class="min-h-screen bg-[var(--base00)] text-[var(--base05)] flex flex-col">
            <Navbar fixed>
                <A href="/" class="text-[var(--base0D)] hover:underline font-medium text-sm">
                    ← Back to Home
                </A>
            </Navbar>

            <div class="flex-1 flex items-center justify-center px-4">
                <div class="w-full max-w-md px-6 py-8 bg-[var(--base01)] rounded-2xl shadow-lg transition-all duration-300 transform animate-fade-in">
                    <Show when={statusMsg()}>
                        <div class="mb-4 p-3 rounded bg-[var(--base0B)] text-[var(--base00)] text-center font-medium animate-fade-in">
                            {statusMsg()}
                        </div>
                    </Show>
                    <h2 class="text-3xl font-bold text-center text-[var(--base07)] mb-6">
                        Welcome Back
                    </h2>
                    <form class="space-y-4" onSubmit={handleSubmit}>
                        <input
                            class="w-full px-4 py-2 border border-[var(--base03)] bg-[var(--base00)] text-[var(--base05)] placeholder-[var(--base04)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--base0D)] transition-all duration-150"
                            type="email"
                            placeholder="Email address"
                            value={email()}
                            onInput={(e) => setEmail(e.currentTarget.value)}
                            required
                        />
                        <input
                            class="w-full px-4 py-2 border border-[var(--base03)] bg-[var(--base00)] text-[var(--base05)] placeholder-[var(--base04)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--base0D)] transition-all duration-150"
                            type="password"
                            placeholder="Password"
                            value={password()}
                            onInput={(e) => setPassword(e.currentTarget.value)}
                            required
                        />
                        <Show when={error()}>
                            <p class="text-sm text-[var(--base08)] transition-opacity duration-300 animate-fade-in">
                                {error()}
                            </p>
                        </Show>
                        <button
                            type="submit"
                            class="button w-full py-2 px-4 font-semibold transition-all duration-200"
                        >
                            Login
                        </button>
                    </form>
                    <div class="mt-4 text-center text-sm text-[var(--base04)]">
                        Don’t have an account?{" "}
                        <A href="/register" class="text-[var(--base0D)] hover:underline">
                            Sign up
                        </A>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login
