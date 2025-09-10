import { Switch, Match } from "solid-js"
import { IconArrowPath, IconTick, IconError } from "@/components/icons"

export type SyncStatusProps = {
    handleSync: () => Promise<void>
    isSyncing: boolean
    error?: string
}

export function SyncStatus(props: SyncStatusProps) {
    return (
        <div class="flex items-center justify-between mb-6 bg-base01 rounded-lg p-4 border border-base02">
            <div class="flex items-center gap-2">
                <Switch
                    fallback={
                        <>
                            <IconTick class="text-green-500" />
                            <span class="text-sm">Synced</span>
                        </>
                    }
                >
                    <Match when={props.isSyncing}>
                        <IconArrowPath rotation={true} />
                        <span class="text-sm">Syncing…</span>
                    </Match>
                    <Match when={props.error}>
                        <IconError class="text-red-500" />
                        <span class="text-sm text-red-500">{props.error}</span>
                    </Match>
                </Switch>
            </div>
            <button
                onClick={props.handleSync}
                disabled={props.isSyncing}
                class="px-3 py-1.5 rounded bg-base02 hover:bg-base03 disabled:opacity-50 text-sm transition"
            >
                {props.isSyncing ? "Please wait…" : "Sync Now"}
            </button>
        </div>
    )
}
