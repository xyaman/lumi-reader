import { lsReadingSessions } from "../../services/localStorage"

export function SessionSettings() {
    const automaticStart = () => lsReadingSessions.autoStart()
    const synchronize = () => lsReadingSessions.autoSync()

    return (
        <section>
            <h2 class="text-2xl font-semibold">Session Settings</h2>
            <div class="mt-5 space-y-3">
                <div class="flex items-center space-x-2">
                    <input
                        id="automatic-checkbox"
                        type="checkbox"
                        checked={automaticStart()}
                        onChange={(e) => lsReadingSessions.setAutoStart(e.target.checked)}
                    />
                    <label for="automatic-checkbox" class="text-sm font-medium">
                        Start reading session automatically
                    </label>
                </div>
                <div class="flex items-center space-x-2">
                    <input
                        id="sync-checkbox"
                        type="checkbox"
                        checked={synchronize()}
                        onChange={(e) => lsReadingSessions.setAutoSync(e.target.checked)}
                    />
                    <label for="sync-checkbox" class="text-sm font-medium">
                        Synchronize with server automatically
                    </label>
                </div>
            </div>
        </section>
    )
}
