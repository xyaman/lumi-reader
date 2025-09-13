import { createMemo, createSignal, Show } from "solid-js"
import { Calendar } from "./Calendar"
import Checkbox from "@/ui/checkbox"
import { IconArrowPath } from "@/components/icons"

export type SessionsToolbarProps = {
    groupByBook: boolean
    setGroupByBook: (b: boolean) => void
    setSortBy: (by: string) => void
    dateRange: { from: Date; to: Date }

    onDateRangeSelect: (from: Date, to: Date) => void
    onSync: () => Promise<void>
}

export function SessionsToolbar(props: SessionsToolbarProps) {
    const [showCalendar, setShowCalendar] = createSignal(false)
    const [selectedOpt, setSelectedOpt] = createSignal<string | null>("Today")

    const [isSyncing, setIsSyncing] = createSignal(false)
    const [syncError, setSyncError] = createSignal<string | null>(null)

    const options = createMemo(() => [
        { label: "Today", range: [new Date(), new Date()], active: selectedOpt() === "Today" },
        {
            label: "Last 7 Days",
            range: [new Date(new Date().setDate(new Date().getDate() - 6)), new Date()],
            active: selectedOpt() === "Last 7 Days",
        },
        {
            label: "This Month",
            range: [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()],
            active: selectedOpt() === "This Month",
        },
    ])

    const handleOptClick = (opt: { label: string; range: Date[] }) => {
        props.onDateRangeSelect(opt.range[0], opt.range[1])

        setSelectedOpt(opt.label)

        setShowCalendar(false)
    }

    const handleCalendarClick = () => {
        setSelectedOpt(null)
        setShowCalendar(true)
    }

    const handleSync = async () => {
        setSyncError(null)
        setIsSyncing(true)

        try {
            await props.onSync()
        } catch (err: any) {
            setSyncError(err?.message || "Sync failed")
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div class="bg-base01 rounded-lg p-4 mb-6">
            <div class="space-y-4">
                <div class="flex flex-wrap gap-4">
                    {/* Group by Book Toggle */}
                    <div class="flex items-center">
                        <Checkbox
                            checked={props.groupByBook}
                            onChange={() => props.setGroupByBook(!props.groupByBook)}
                        />
                        <label class="text-sm ml-2">Group by Book</label>
                    </div>

                    {/* Sort Dropdown */}
                    <select
                        class="cursor-pointer border border-base04 rounded px-3 py-1 text-sm"
                        onChange={(e) => props.setSortBy(e.currentTarget.value)}
                    >
                        <option value="">Sort by...</option>
                        <option value="date">Date</option>
                        <option value="time">Time Spent</option>
                    </select>

                    {/* Sync Button */}
                    <button
                        class="flex items-center gap-2 px-3 py-1 rounded bg-base02 hover:bg-base03 transition text-sm cursor-pointer"
                        onClick={handleSync}
                        disabled={isSyncing()}
                    >
                        <IconArrowPath rotation={isSyncing()} />
                        {isSyncing() ? "Syncing…" : "Sync"}
                    </button>
                </div>

                {/* Preset Buttons */}
                <div class="flex flex-wrap items-center gap-2">
                    {options().map((opt) => (
                        <button
                            class="bg-base02 hover:bg-base03 cursor-pointer px-3 py-1 rounded-full text-sm font-medium"
                            classList={{ "bg-base03": opt.active }}
                            onClick={() => handleOptClick(opt)}
                        >
                            {opt.label}
                        </button>
                    ))}

                    {/* Calendar Trigger */}
                    <button
                        class="px-3 py-1 bg-base02 hover:bg-base03 rounded-full text-sm cursor-pointer"
                        classList={{ "bg-base03": selectedOpt() === null }}
                        onClick={handleCalendarClick}
                    >
                        Custom Range
                    </button>
                </div>
            </div>

            {/* Calendar */}

            {showCalendar() && (
                <div class="w-min">
                    <Calendar mode="range" onValueChange={(e) => props.onDateRangeSelect(e.from!, e.to!)} />
                </div>
            )}

            {/* Error Message */}
            <Show when={syncError() !== null}>
                <div class="mt-4 p-2 bg-red-100 text-red-700 rounded text-sm">{syncError()}</div>
            </Show>
        </div>
    )
}
