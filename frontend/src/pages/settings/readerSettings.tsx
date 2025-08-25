import { createReaderSettings } from "@/hooks"
import { LabeledSlider } from "@/ui"
import Checkbox from "@/ui/checkbox"

export function ReaderSettings(props: { isEmbedded?: boolean }) {
    const [settings, setSettings] = createReaderSettings()

    // computed at creation time
    const checkboxGridClass = props.isEmbedded ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"
    const slidersGridClass = props.isEmbedded ? "mt-4 grid gap-6" : "mt-4 grid grid-cols-1 md:grid-cols-2 gap-6"

    return (
        <div class="p-6">
            <div class={checkboxGridClass}>
                {/* Vertical reading */}
                <div class="flex space-x-2">
                    <Checkbox
                        checked={settings().vertical}
                        onChange={() => setSettings("vertical", !settings().vertical)}
                    />
                    <span>Vertical Reading</span>
                </div>

                {/* Simulate pages */}
                <div class="flex space-x-2">
                    <Checkbox
                        checked={settings().paginated}
                        onChange={() => setSettings("paginated", !settings().paginated)}
                    />
                    <span>Simulate Pages</span>
                </div>

                {/* Show furigana */}
                <div class="flex space-x-2">
                    <Checkbox
                        checked={settings().showFurigana}
                        onChange={() => setSettings("showFurigana", !settings().showFurigana)}
                    />
                    <span>Show Furigana</span>
                </div>
            </div>

            {/* Padding Controls */}
            <div class={slidersGridClass}>
                <LabeledSlider label="Vertical Padding (%)" unit="%" />
                <LabeledSlider label="Horizontal Padding (%)" unit="%" />
            </div>
        </div>
    )
}
