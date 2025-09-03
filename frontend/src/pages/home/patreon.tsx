import { IconPatreon } from "@/components/icons"
import { createResource, For, Match, Show, Switch } from "solid-js"
import { ApiClient } from "@/lib/apiClient"
import { Tier } from "@/types/api"
import { useAuthState } from "@/context/auth"
import { A } from "@solidjs/router"

async function fetchPatreonTiers(): Promise<Tier[]> {
    const response = await ApiClient.request<Tier[]>("/patreon_tiers")
    return response.ok!.data
}

export function PatreonTiers() {
    const [patreonTiers] = createResource(fetchPatreonTiers)
    const authState = useAuthState()

    const listDescription = (tier: Tier) =>
        tier.description?.split(".").filter((b) => b.trim().length > 0) || ["No description"]

    const formatPrice = (cents: number) => {
        const dollars = cents / 100
        return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`
    }

    const isAlreadyEnrolled = (tier: Tier) => {
        return authState.user?.tier?.id === tier.id
    }

    return (
        <div class="container mx-auto px-4 py-12">
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold">Support LumiReader</h1>
                <p class="text-lg max-w-2xl mx-auto mt-4">Help us build the best reading experience.</p>
            </div>

            <Show
                when={!patreonTiers.loading && !patreonTiers.error}
                fallback={
                    <div class="text-center py-12">
                        <Show when={patreonTiers.loading}>
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p>Loading tiers...</p>
                        </Show>
                        <Show when={patreonTiers.error}>
                            <p class="text-red-500">Failed to load Patreon tiers. Please try again later.</p>
                        </Show>
                    </div>
                }
            >
                <Show when={authState.user}>
                    <div class="mb-8 text-center">
                        <Switch
                            fallback={
                                <span>
                                    Already a patron?{" "}
                                    <A href="/login" class="underline text-0D">
                                        Sync your account
                                    </A>
                                </span>
                            }
                        >
                            <Match when={authState.user?.isPatreonLinked}>
                                <span>
                                    Tier not being updated?{" "}
                                    <A href="/settings/account" class="underline text-0D">
                                        Force a refresh
                                    </A>
                                </span>
                            </Match>
                            <Match when={!authState.user?.isPatreonLinked}>
                                <a
                                    href="/settings/account"
                                    class="inline-flex bg-base01 items-center gap-2 px-4 py-2 rounded font-semibold transition"
                                >
                                    <IconPatreon />
                                    <span>Sync with Patreon</span>
                                </a>
                            </Match>
                        </Switch>
                    </div>
                </Show>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    <For each={patreonTiers()}>
                        {(tier) => (
                            <div class="border border-base02 rounded-lg p-6 flex flex-col">
                                <div class="text-center mb-6">
                                    <h2 class="text-2xl font-bold mb-2">{tier.name}</h2>
                                    <div class="text-4xl font-bold mb-2">
                                        {formatPrice(tier.amountCents)}
                                        <span class="text-base font-normal">/month</span>
                                    </div>
                                </div>

                                <ul class="mb-6 flex-1 space-y-3">
                                    <For each={listDescription(tier)}>
                                        {(feature) => (
                                            <li class="flex items-start gap-3">
                                                <span class="text-lg mt-0.5 flex-shrink-0">✓</span>
                                                <span>{feature.trim()}</span>
                                            </li>
                                        )}
                                    </For>
                                </ul>

                                <Show
                                    when={isAlreadyEnrolled(tier)}
                                    fallback={
                                        <a
                                            href="https://www.patreon.com/lumireader"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="w-full font-bold bg-base01 py-3 px-5 rounded-lg transition-colors text-center block mt-auto flex items-center justify-center gap-2"
                                        >
                                            <IconPatreon />
                                            <span>Become a Patron</span>
                                        </a>
                                    }
                                >
                                    <div class="w-full font-bold bg-base02 text-base04 py-3 px-5 rounded-lg text-center block mt-auto flex items-center justify-center gap-2 cursor-not-allowed">
                                        <IconPatreon />
                                        <span>Already Enrolled</span>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    )
}
