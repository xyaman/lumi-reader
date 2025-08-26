import { useAuthDispatch, useAuthState } from "@/context/auth"
import { Button, Input, Navbar } from "@/ui"
import { A, useNavigate } from "@solidjs/router"
import { createEffect, createSignal, Show } from "solid-js"

const verificationStatus: Record<string, string> = {
    already_confirmed: "Email already confirmed.",
    invalid_token: "Invalid or expired confirmation link.",
    confirmed: "Email confirmed! You can now log in.",
}

export function Login() {
    const authState = useAuthState()
    const authDispatch = useAuthDispatch()
    const navigate = useNavigate()

    let emailInput: HTMLInputElement | null = null
    let passwordInput: HTMLInputElement | null = null

    const params = new URLSearchParams(location.search)

    const verificationMessage = verificationStatus[params.get("status") as any] ?? null
    const [error, setError] = createSignal<string | null>(null)

    createEffect(() => {
        if (authState.status === "authenticated") {
            navigate("/", { replace: true })
        }
    })

    const handleSubmit = async (e: Event) => {
        e.preventDefault()

        if (!emailInput?.value || !passwordInput?.value) {
            setError("Please enter your email and password.")
            return
        }

        // disable ui
        emailInput.disabled = true
        passwordInput.disabled = true

        const res = await authDispatch.login({ email: emailInput.value, password: passwordInput.value })
        if (res.error) {
            setError(res.error.message)
            // re-enable ui
            emailInput.disabled = false
            passwordInput.disabled = false
            console.error(res.error)
            return
        }
    }

    return (
        <div class="min-h-screen bg-base00 text-base05 flex flex-col">
            <Navbar fixed>
                <A href="/" class="text-base0D hover:underline font-medium text-sm">
                    Lumi Reader
                </A>
            </Navbar>

            <div class="flex-1 flex items-center justify-center px-4">
                <div class="w-full max-w-md px-6 py-8 bg-base01 rounded-2xl shadow-lg transition-all duration-300 transform animate-fade-in">
                    <Show when={verificationMessage}>
                        <div class="mb-4 p-3 rounded bg-base0B text-base00 text-center font-medium animate-fade-in">
                            {verificationMessage}
                        </div>
                    </Show>
                    <h2 class="text-3xl font-bold text-center text-base07 mb-6">Welcome Back</h2>
                    <form class="space-y-4" onSubmit={handleSubmit}>
                        <Input
                            ref={(el) => (emailInput = el)}
                            type="email"
                            placeholder="Email address"
                            autocomplete="email"
                            required
                        />
                        <Input
                            ref={(el) => (passwordInput = el)}
                            type="password"
                            placeholder="Password"
                            autocomplete="current-password"
                            required
                        />
                        <Show when={error()}>
                            <p class="text-sm text-base08 transition-opacity duration-300 animate-fade-in">{error()}</p>
                        </Show>
                        <Button type="submit" classList={{ "w-full": true }}>
                            Login
                        </Button>
                    </form>
                    <div class="mt-4 text-center text-sm text-base04">
                        Don’t have an account?{" "}
                        <A href="/register" class="text-base0D hover:underline">
                            Sign up
                        </A>
                    </div>
                </div>
            </div>
        </div>
    )
}
