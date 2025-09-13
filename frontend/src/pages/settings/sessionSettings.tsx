import { Checkbox } from "@/ui"
import { lsReadingSessions } from "../../services/localStorage"

export function SessionSettings() {
    const automaticStart = () => lsReadingSessions.autoStart()
    const synchronize = () => lsReadingSessions.autoSync()

    return (
        <section>
            <h2 class="text-2xl font-semibold">Session Settings</h2>
            <div class="mt-5 space-y-3">
                <div class="flex items-center space-x-2">
                    <Checkbox
                        checked={automaticStart()}
                        onChange={() => lsReadingSessions.setAutoStart(!automaticStart())}
                    />
                    <span> Start reading session automatically</span>
                </div>
                <div class="flex items-center space-x-2">
                    <Checkbox checked={synchronize()} onChange={() => lsReadingSessions.setAutoSync(!synchronize())} />
                    <span>Synchronize with server automatically</span>
                </div>
            </div>
        </section>
    )
}
