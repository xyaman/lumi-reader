import { authApi } from "@/api/auth"
import { Button, infoToast, Input, Navbar } from "@/ui"
import { A, useNavigate } from "@solidjs/router"
import { createSignal, onMount, Show } from "solid-js"

export function ResetPassword() {
    const navigate = useNavigate()
    const params = new URLSearchParams(location.search)
    let resetToken: string

    const [error, setError] = createSignal<string | null>(null)
    let passwordInput: HTMLInputElement | null = null
    let confirmPasswordInput: HTMLInputElement | null = null

    onMount(() => {
        if (!params.get("token") || params.get("token") === "expired") {
            passwordInput!.disabled = true
            confirmPasswordInput!.disabled = true
            setError("Expired token...")
        }

        resetToken = params.get("token")!
    })

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        if (!passwordInput?.value || !confirmPasswordInput?.value) {
            return
        }

        setError(null)

        if (passwordInput.value !== confirmPasswordInput.value) {
            setError("Passwords do not match.")
            return
        }

        passwordInput.disabled = true
        confirmPasswordInput.disabled = true
        console.log(resetToken)

        const res = await authApi.resetPassword(
            {
                password: passwordInput.value,
                password_confirmation: confirmPasswordInput.value,
            },
            resetToken,
        )

        if (res.error) return setError(res.error.message)

        infoToast("Password reset successfully. Redirecting in 2 seconds...")
        setTimeout(() => {
            passwordInput!.disabled = false
            confirmPasswordInput!.disabled = false
            navigate("/login")
        }, 2000)
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
                    <h2 class="text-3xl font-bold text-center text-base07 mb-6">Reset Password</h2>
                    <form class="space-y-4" onSubmit={handleSubmit}>
                        <Input
                            ref={(el) => (passwordInput = el)}
                            type="password"
                            placeholder="New password"
                            autocomplete="new-password"
                            required
                        />
                        <Input
                            ref={(el) => (confirmPasswordInput = el)}
                            type="password"
                            placeholder="Confirm new password"
                            autocomplete="new-password"
                            required
                        />
                        <Show when={error()}>
                            <p class="text-sm text-base08 transition-opacity duration-300 animate-fade-in">{error()}</p>
                        </Show>
                        <Button type="submit" class="w-full">
                            Reset Password
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
