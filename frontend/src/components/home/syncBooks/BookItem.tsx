import { ApiUserBook } from "@/api/userBooks"
import { IconClock } from "@/components/icons"
import { Button } from "@/ui"
import { createMemo, createSignal, Show } from "solid-js"

type HandlerFunc = (
    book: ApiUserBook & { syncStatus: "up-to-date" | "cloud-new" | "local-new" | "cloud-only" | "local-only" },
    onProgress: (percent: number) => void,
) => Promise<void>

export type BookItemProps = {
    book: ApiUserBook & { syncStatus: "up-to-date" | "cloud-new" | "local-new" | "cloud-only" | "local-only" }
    uploadHandler?: HandlerFunc
    downloadHandler?: HandlerFunc
    syncHandler?: (book: ApiUserBook) => Promise<void>
    deleteHandler?: (book: ApiUserBook) => Promise<void>
}

export function BookItem(props: BookItemProps) {
    const [isLoadingSync, setIsLoadingSync] = createSignal(false)
    const [isLoadingDelete, setIsLoadingDelete] = createSignal(false)
    const [progress, setProgress] = createSignal(0)

    const statusConfig = createMemo(() => ({
        "up-to-date": {
            text: "Up to date",
            handler: props.syncHandler,
            hasProgress: false,
        },
        "cloud-new": {
            text: "Outdated",
            handler: props.syncHandler,
            hasProgress: false,
        },
        "local-new": {
            text: "Update cloud",
            handler: props.syncHandler,
            hasProgress: false,
        },
        "cloud-only": {
            text: "Download",
            handler: props.downloadHandler,
            hasProgress: true,
        },
        "local-only": {
            text: "Upload",
            handler: props.uploadHandler,
            hasProgress: true,
        },
    }))

    const handleAction = async () => {
        const config = statusConfig()[props.book.syncStatus]
        if (!config.handler) return

        setIsLoadingSync(true)
        setProgress(0)
        await config.handler(props.book, setProgress)
        setIsLoadingSync(false)
        setProgress(0)
    }

    const handleDelete = async () => {
        if (!props.deleteHandler) return
        setIsLoadingDelete(true)
        await props.deleteHandler(props.book)
        setIsLoadingDelete(false)
    }

    const showProgressBar = createMemo(() => {
        const config = statusConfig()[props.book.syncStatus]
        return isLoadingSync() && config.hasProgress && progress() > 0
    })

    return (
        <li class="p-4">
            <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                    <h3 class="font-medium truncate">{props.book.title}</h3>
                    <div class="text-sm text-base04 flex items-center mt-1">
                        <IconClock class="mr-1 h-3 w-3" />
                        Last synced: 2 hours ago
                    </div>

                    {/* Progress bar - only for upload/download */}
                    <Show when={showProgressBar()}>
                        <div class="mt-2">
                            <div class="bg-base03 rounded-full h-2">
                                <div
                                    class="bg-base0D h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress()}%` }}
                                />
                            </div>
                            <span class="text-xs text-base04 mt-1">{progress()}%</span>
                        </div>
                    </Show>
                </div>

                <div class="flex items-center space-x-2 ml-4">
                    {/* Delete button only if present */}
                    <Show when={props.book.syncStatus !== "local-only" && props.deleteHandler}>
                        <Button size="sm" disabled={isLoadingSync()} onClick={handleDelete}>
                            <Show when={isLoadingDelete()} fallback="Delete">
                                <div class="flex items-center">
                                    <div class="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2" />
                                    Deleting...
                                </div>
                            </Show>
                        </Button>
                    </Show>

                    {/* Action button: disable when isLoading */}
                    <Button
                        size="sm"
                        disabled={isLoadingSync() || !statusConfig()[props.book.syncStatus].handler}
                        onClick={handleAction}
                    >
                        <Show when={isLoadingSync()} fallback={statusConfig()[props.book.syncStatus].text}>
                            <div class="flex items-center">
                                <div class="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2" />
                                {statusConfig()[props.book.syncStatus].text}...
                            </div>
                        </Show>
                    </Button>
                </div>
            </div>
        </li>
    )
}
