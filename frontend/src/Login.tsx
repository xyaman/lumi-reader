import { createSignal } from "solid-js"
import Navbar from "./components/Navbar"
import { useNavigate } from "@solidjs/router"
import api from "./lib/api"

function Login() {
    const [email, setEmail] = createSignal("")
    const [password, setPassword] = createSignal("")
    const [error, setError] = createSignal("")

    const navigate = useNavigate()

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        // TODO: Implement login logic
        setError("")

        try {
            const body = {
                email: email(),
                password: password(),
            }
            const data = await api.login(body)
            localStorage.setItem("user:id", String(data.user.id))
            localStorage.setItem("user:username", data.user.username)
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
                <Navbar.Left>Login</Navbar.Left>
            </Navbar>
            <div class="h-screen m-aubg-[var(--base00)] text-[var(--base05)]">
                <div class="h-full flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div class="w-full max-w-md space-y-8 bg-[var(--base01)] p-8 rounded shadow">
                        <h2 class="mt-2 text-center text-3xl font-extrabold text-[var(--base07)]">
                            Login
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
                                    type="password"
                                    placeholder="Password"
                                    value={password()}
                                    onInput={(e) => setPassword(e.currentTarget.value)}
                                    required
                                />
                            </div>
                            {error() && <p class="text-[var(--base08)] text-sm mt-2">{error()}</p>}
                            <div>
                                <button
                                    type="submit"
                                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded bg-[var(--base0D)] text-[var(--base00)] hover:bg-[var(--base0C)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--base0D)]"
                                >
                                    Login
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Login
