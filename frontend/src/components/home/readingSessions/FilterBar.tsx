import { createMemo, createSignal } from "solid-js"
import { Calendar } from "./Calendar"
import Checkbox from "@/ui/checkbox"

export type FilterBarProps = {
    groupByBook: boolean
    setGroupByBook: (b: boolean) => void
    setSortBy: (by: string) => void
    dateRange: { from: Date; to: Date }
    onDateRangeSelect: (from: Date, to: Date) => void
}

export function FilterBar(props: FilterBarProps) {
    const [showCalendar, setShowCalendar] = createSignal(false)
    const [selectedOpt, setSelectedOpt] = createSignal<string | null>("Today")

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

    return (
        <div class="bg-base01 rounded-lg shadow-md p-4 sticky top-0 z-10 mb-6">
            <div class="flex flex-wrap items-center gap-4">
                {/* Preset Buttons */}
                <div class="flex flex-wrap items-center gap-2">
                    {options().map((opt) => (
                        <button
                            class="bg-base02 px-3 py-1 rounded-full text-sm font-medium"
                            classList={{ "bg-base03": opt.active }}
                            onClick={() => handleOptClick(opt)}
                        >
                            {opt.label}
                        </button>
                    ))}

                    {/* Calendar Trigger */}
                    <button
                        class="px-3 py-1 bg-base02 rounded-full text-sm"
                        classList={{ "bg-base03": selectedOpt() === null }}
                        onClick={handleCalendarClick}
                    >
                        Custom Range
                    </button>
                </div>

                {/* Group by Book Toggle */}
                <div class="flex items-center ml-auto">
                    <Checkbox checked={props.groupByBook} onChange={() => props.setGroupByBook(!props.groupByBook)} />
                    <label class="text-sm ml-2">Group by Book</label>
                </div>

                {/* Sort Dropdown */}
                <div class="flex items-center gap-2">
                    <select
                        class="border rounded px-3 py-1 text-sm"
                        onChange={(e) => props.setSortBy(e.currentTarget.value)}
                    >
                        <option value="date">Sort by Date</option>
                        <option value="duration">Sort by Duration</option>
                        <option value="book">Sort by Book</option>
                    </select>
                </div>
            </div>

            {/* Calendar Popup */}
            {showCalendar() && (
                <div class="w-min">
                    <Calendar mode="range" onValueChange={(e) => props.onDateRangeSelect(e.from!, e.to!)} />
                </div>
            )}
        </div>
    )
}
