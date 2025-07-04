import { createSignal, Show } from "solid-js"
import { A, useNavigate } from "@solidjs/router"
import api from "./lib/api"
import Navbar from "./components/Navbar"

function Register() {
    const [email, setEmail] = createSignal("")
    const [username, setUsername] = createSignal("")
    const [password, setPassword] = createSignal("")
    const [confirm, setConfirm] = createSignal("")
    const [error, setError] = createSignal("")

    const navigate = useNavigate()

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        if (password() !== confirm()) {
            setError("Passwords do not match")
            return
        }

        setError("")

        try {
            const body = {
                email: email(),
                username: username(),
                password: password(),

                password_confirmation: confirm(),
            }

            const res = await api.register(body)

            localStorage.setItem("user:id", String(res.user.id))
            localStorage.setItem("user:username", res.user.username)
            navigate("/profile")
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
            <Navbar>
                <A href="/" class="text-[var(--base0D)] hover:underline font-medium text-sm">
                    ← Back to Home
                </A>
            </Navbar>

            {/* Register Form */}
            <div class="flex-1 flex items-center justify-center px-4">
                <div class="w-full max-w-md px-6 py-8 bg-[var(--base01)] rounded-2xl shadow-lg transition-all duration-300 transform animate-fade-in">
                    <h2 class="text-3xl font-bold text-center text-[var(--base07)] mb-6">
                        Create Account
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
                            type="text"
                            placeholder="Username"
                            value={username()}
                            onInput={(e) => setUsername(e.currentTarget.value)}
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
                        <input
                            class="w-full px-4 py-2 border border-[var(--base03)] bg-[var(--base00)] text-[var(--base05)] placeholder-[var(--base04)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--base0D)] transition-all duration-150"
                            type="password"
                            placeholder="Confirm Password"
                            value={confirm()}
                            onInput={(e) => setConfirm(e.currentTarget.value)}
                            required
                        />

                        <Show when={error()}>
                            <p class="text-sm text-[var(--base08)] transition-opacity duration-300 animate-fade-in">
                                {error()}
                            </p>
                        </Show>

                        <button
                            type="submit"
                            class="w-full py-2 px-4 bg-[var(--base0D)] text-[var(--base00)] rounded-md hover:bg-[var(--base0C)] font-semibold transition-all duration-200"
                        >
                            Register
                        </button>
                    </form>

                    <div class="mt-4 text-center text-sm text-[var(--base04)]">
                        Already have an account?{" "}
                        <A href="/login" class="text-[var(--base0D)] hover:underline">
                            Log in
                        </A>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register
