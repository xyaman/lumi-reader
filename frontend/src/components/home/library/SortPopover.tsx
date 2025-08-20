import { createEffect, createSignal } from "solid-js"
import { useLibraryDispatch, useLibraryState } from "@/context/library"
import { IconFilter } from "@/components/icons"
import Popover from "@corvu/popover"

/**
 * Displays a popover UI for selecting sorting options.
 * Note: Needs access to <LibraryProvider>
 */
export function SortPopover() {
    const libraryState = useLibraryState()
    const { setSortParams } = useLibraryDispatch()

    const [sortBy, setSortBy] = createSignal(libraryState.sort || "lastModifiedDate")
    const [order, setOrder] = createSignal(libraryState.dir || "desc")

    createEffect(() => {
        setSortParams(sortBy(), order())
    })

    return (
        <Popover floatingOptions={{ offset: 13, flip: true, shift: true }}>
            <Popover.Trigger class="max-h-[40px] cursor-pointer bg-base02 hover:bg-base03 px-4 rounded-md flex items-center">
                <IconFilter />
                <span class="ml-2">Sort</span>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content class="z-50 rounded-lg bg-base02 px-3 py-2 shadow-md">
                    <Popover.Label class="font-bold">Sort Options</Popover.Label>
                    <div class="mt-2">
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={sortBy() === "byLastUpdate"}
                                    onChange={() => setSortBy("byLastUpdate")}
                                />
                                <span class="ml-2">Last Read</span>
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="sortBy"
                                    checked={sortBy() === "byCreationDate"}
                                    onChange={() => setSortBy("byCreationDate")}
                                />
                                <span class="ml-2">Added Time</span>
                            </label>
                        </div>
                        <div class="mt-2">
                            <label>
                                <input
                                    type="radio"
                                    name="order"
                                    checked={order() === "asc"}
                                    onChange={() => setOrder("asc")}
                                />
                                <span class="ml-2">Ascending</span>
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name="order"
                                    checked={order() === "desc"}
                                    onChange={() => setOrder("desc")}
                                />
                                <span class="ml-2">Descending</span>
                            </label>
                        </div>
                    </div>
                    <Popover.Arrow class="text-base02" />
                </Popover.Content>
            </Popover.Portal>
        </Popover>
    )
}
