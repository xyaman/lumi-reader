import { createSignal } from "solid-js"
import Navbar from "./components/Navbar"
import { useNavigate } from "@solidjs/router"
import api from "./lib/api"

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
        <>
            <Navbar>
                <Navbar.Left>Register</Navbar.Left>
            </Navbar>

            <div class="h-screen m-aubg-[var(--base00)] text-[var(--base05)]">
                <div class="h-full flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div class="w-full max-w-md space-y-8 bg-[var(--base01)] p-8 rounded shadow">
                        <h2 class="mt-2 text-center text-3xl font-extrabold text-[var(--base07)]">
                            Register
                        </h2>
                        <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
                            <div class="rounded-md shadow-sm -space-y-px">
                                <input
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-[var(--base03)] placeholder-[var(--base04)] bg-[var(--base00)] text-[var(--base05)] focus:outline-none focus:ring-[var(--base0D)] focus:border-[var(--base0D)] focus:z-10 sm:text-sm"
                                    type="email"
                                    placeholder="Email address"
                                    value={email()}
                                    onInput={(e) => setEmail(e.currentTarget.value)}
                                    required
                                />
                                <input
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-[var(--base03)] placeholder-[var(--base04)] bg-[var(--base00)] text-[var(--base05)] focus:outline-none focus:ring-[var(--base0D)] focus:border-[var(--base0D)] focus:z-10 sm:text-sm mt-4"
                                    placeholder="Username"
                                    value={username()}
                                    onInput={(e) => setUsername(e.currentTarget.value)}
                                    required
                                />
                                <input
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-[var(--base03)] placeholder-[var(--base04)] bg-[var(--base00)] text-[var(--base05)] focus:outline-none focus:ring-[var(--base0D)] focus:border-[var(--base0D)] focus:z-10 sm:text-sm mt-4"
                                    type="password"
                                    placeholder="Password"
                                    value={password()}
                                    onInput={(e) => setPassword(e.currentTarget.value)}
                                    required
                                />
                                <input
                                    class="appearance-none rounded-none relative block w-full px-3 py-2 border border-[var(--base03)] placeholder-[var(--base04)] bg-[var(--base00)] text-[var(--base05)] focus:outline-none focus:ring-[var(--base0D)] focus:border-[var(--base0D)] focus:z-10 sm:text-sm mt-4"
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirm()}
                                    onInput={(e) => setConfirm(e.currentTarget.value)}
                                    required
                                />
                            </div>
                            {error() && <p class="text-[var(--base08)] text-sm mt-2">{error()}</p>}
                            <button class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded bg-[var(--base0D)] text-[var(--base00)] hover:bg-[var(--base0C)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--base0D)]">
                                Register
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Register
