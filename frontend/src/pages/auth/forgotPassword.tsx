import { authApi } from "@/api/auth"
import { Button, Input, Navbar } from "@/ui"
import { A } from "@solidjs/router"
import { createSignal, Show } from "solid-js"

export function ForgotPassword() {
    let emailInput: HTMLInputElement | null = null
    const [error, setError] = createSignal<string | null>(null)

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        if (!emailInput?.value) {
            return
        }
        setError(null)

        emailInput.disabled = true

        // TODO: call api to send reset link
        const res = await authApi.sendResetPasswordMail(emailInput.value)
        if (res.error) {
            setError(res.error.message)
        }

        emailInput.disabled = false
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
                    <h2 class="text-3xl font-bold text-center text-base07 mb-6">Forgot Password</h2>
                    <p class="text-center text-base04 mb-6">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                    <form class="space-y-4" onSubmit={handleSubmit}>
                        <Input
                            ref={(el) => (emailInput = el)}
                            type="email"
                            placeholder="Email address"
                            autocomplete="email"
                            required
                        />
                        <Show when={error()}>
                            <p class="text-sm text-base08 transition-opacity duration-300 animate-fade-in">{error()}</p>
                        </Show>
                        <Button type="submit" class="w-full">
                            Send Reset Link
                        </Button>
                    </form>
                    <div class="mt-4 text-center text-sm text-base04">
                        Remember your password?{" "}
                        <A href="/login" class="text-base0D hover:underline">
                            Login
                        </A>
                    </div>
                </div>
            </div>
        </div>
    )
}
