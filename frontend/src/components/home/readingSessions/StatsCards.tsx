import { For } from "solid-js"
export type StatCard = {
    label: string
    value: string | number
}

export type StatsCardsProps = {
    stats: StatCard[]
}

export function StatsCards(props: StatsCardsProps) {
    return (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <For each={props.stats}>
                {(stat) => (
                    <div class="bg-base01 rounded-lg shadow p-4">
                        <div class="flex justify-between items-start">
                            <h3 class="text-sm font-medium">{stat.label}</h3>
                            <p class="text-2xl font-bold mt-1">{stat.value}</p>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}
