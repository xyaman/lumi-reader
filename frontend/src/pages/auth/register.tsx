import { authApi } from "@/api/auth"
import { Button, Input, Navbar } from "@/ui"
import { A } from "@solidjs/router"
import { createSignal, Show } from "solid-js"

export function Register() {
    let emailInput: HTMLInputElement | null = null
    let usernameInput: HTMLInputElement | null = null
    let passwordInput: HTMLInputElement | null = null
    let passwordConfirmationInput: HTMLInputElement | null = null

    const [confirmationSent, setConfirmationSent] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)
    const email = () => emailInput?.value

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        if (passwordInput?.value !== passwordConfirmationInput?.value) {
            setError("Passwords do not match.")
            return
        }

        if (!emailInput?.value || !usernameInput?.value || !passwordInput?.value || !passwordConfirmationInput?.value) {
            setError("All fields are required.")
            return
        }
        setError(null)

        const credentials = {
            email: emailInput?.value,
            username: usernameInput?.value,
            password: passwordInput?.value,
            password_confirmation: passwordConfirmationInput?.value,
        }

        const res = await authApi.register(credentials)
        if (res.error) {
            return setError(res.error.message)
        }

        setConfirmationSent(true)
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
                    <Show
                        when={!confirmationSent()}
                        fallback={
                            <div class="text-center">
                                <h2 class="text-2xl font-bold mb-4 text-base07">Confirm your email</h2>
                                <p class="mb-4 text-base05">
                                    We've sent a confirmation link to <span class="font-semibold">{email()}</span>.
                                    <br />
                                    Please check your inbox and follow the instructions to activate your account.
                                </p>
                                <A href="/login" class="text-base0D hover:underline">
                                    Go to Login
                                </A>
                            </div>
                        }
                    >
                        <h2 class="text-3xl font-bold text-center text-base07 mb-6">Create Account</h2>
                        <form class="space-y-4" onSubmit={handleSubmit}>
                            <Input
                                ref={(el) => (emailInput = el)}
                                type="email"
                                placeholder="Email address"
                                required
                                autocomplete="email"
                            />
                            <Input
                                ref={(el) => (usernameInput = el)}
                                type="text"
                                placeholder="Username"
                                required
                                autocomplete="username"
                            />
                            <Input
                                ref={(el) => (passwordInput = el)}
                                type="password"
                                placeholder="Password"
                                required
                                autocomplete="new-password"
                            />
                            <Input
                                ref={(el) => (passwordConfirmationInput = el)}
                                type="password"
                                placeholder="Confirm Password"
                                required
                                autocomplete="new-password"
                            />

                            <Show when={error()}>
                                <p class="text-sm text-base08 transition-opacity duration-300 animate-fade-in">
                                    {error()}
                                </p>
                            </Show>
                            <Button type="submit" classList={{ "w-full": true }}>
                                Register
                            </Button>
                        </form>
                        <div class="mt-4 text-center text-sm text-base04">
                            Already have an account?{" "}
                            <A href="/login" class="text-base0D hover:underline">
                                Log in
                            </A>
                        </div>
                    </Show>
                </div>
            </div>
        </div>
    )
}
