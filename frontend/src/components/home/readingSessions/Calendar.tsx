import CorvuCalendar, { RootRangeProps, RootChildrenRangeProps } from "@corvu/calendar"
import { Index } from "solid-js"

export function Calendar(props: RootRangeProps) {
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    return (
        <CorvuCalendar initialMonth={prevMonth} numberOfMonths={2} {...props}>
            {(calendarProps: RootChildrenRangeProps) => (
                <div class="bg-base01 relative my-4 rounded-md p-3 shadow-md md:my-8">
                    <CorvuCalendar.Nav
                        action="prev-month"
                        aria-label="Go to previous month"
                        class="absolute left-3 size-7 rounded-sm bg-(--base02) p-0.75 hover:bg-(--base03)"
                    >
                        {"<"}
                    </CorvuCalendar.Nav>
                    <CorvuCalendar.Nav
                        action="next-month"
                        aria-label="Go to next month"
                        class="absolute right-3 size-7 rounded-sm bg-(--base02) p-0.75 hover:bg-(--base03)"
                    >
                        {">"}
                    </CorvuCalendar.Nav>
                    <div class="space-y-4 md:flex md:space-x-4 md:space-y-0">
                        <Index each={calendarProps.months}>
                            {(month, index) => (
                                <div class={index === 1 ? "" : "hidden md:block"}>
                                    <div class="flex h-7 items-center justify-center">
                                        <CorvuCalendar.Label index={index} class="text-sm text-(--base05)">
                                            {formatMonth(month().month)} {month().month.getFullYear()}
                                        </CorvuCalendar.Label>
                                    </div>
                                    <CorvuCalendar.Table index={index} class="mt-3">
                                        <thead>
                                            <tr>
                                                <Index each={calendarProps.weekdays}>
                                                    {(weekday) => (
                                                        <CorvuCalendar.HeadCell
                                                            abbr={formatWeekdayLong(weekday())}
                                                            class="w-8 flex-1 pb-1 text-xs font-normal opacity-65 text-(--base06)"
                                                        >
                                                            {formatWeekdayShort(weekday())}
                                                        </CorvuCalendar.HeadCell>
                                                    )}
                                                </Index>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <Index each={month().weeks}>
                                                {(week) => (
                                                    <tr>
                                                        <Index each={week()}>
                                                            {(day) => (
                                                                <CorvuCalendar.Cell class="p-0 has-data-range-end:rounded-r-md has-data-range-start:rounded-l-md has-data-in-range:bg-(--base02) has-[[disabled]]:opacity-40 has-data-in-range:first:rounded-l-md has-data-in-range:last:rounded-r-md">
                                                                    <CorvuCalendar.CellTrigger
                                                                        day={day()}
                                                                        month={month().month}
                                                                        class="inline-flex size-8 items-center justify-center rounded-md text-sm text-(--base05) focus-visible:bg-(--base02) disabled:pointer-events-none data-today:bg-(--base03)/50 data-range-start:bg-(--base04) data-range-end:bg-(--base04) lg:hover:not-data-range-start:not-data-range-end:bg-(--base04)/80"
                                                                    >
                                                                        {day().getDate()}
                                                                    </CorvuCalendar.CellTrigger>
                                                                </CorvuCalendar.Cell>
                                                            )}
                                                        </Index>
                                                    </tr>
                                                )}
                                            </Index>
                                        </tbody>
                                    </CorvuCalendar.Table>
                                </div>
                            )}
                        </Index>
                    </div>
                </div>
            )}
        </CorvuCalendar>
    )
}

const { format: formatWeekdayLong } = new Intl.DateTimeFormat("en", {
    weekday: "long",
})
const { format: formatWeekdayShort } = new Intl.DateTimeFormat("en", {
    weekday: "short",
})
const { format: formatMonth } = new Intl.DateTimeFormat("en", {
    month: "long",
})
