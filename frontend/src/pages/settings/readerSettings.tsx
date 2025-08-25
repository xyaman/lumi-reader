import { lsReader } from "@/services/localStorage"
import { LabeledSlider } from "@/ui"
import Checkbox from "@/ui/checkbox"

export function ReaderSettings() {
    return (
        <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vertical reading */}
                <div class="flex space-x-2">
                    <Checkbox checked={lsReader.vertical()} onChange={(e) => console.log("vertical", e.target)} />
                    <span>Vertical Reading</span>
                </div>

                {/* Simulate pages */}
                <div class="flex space-x-2">
                    <Checkbox checked={lsReader.paginated()} onChange={(e) => console.log("paginated", e.target)} />
                    <span>Simulate Pages</span>
                </div>

                {/* Show furigana */}
                <div class="flex space-x-2">
                    <Checkbox
                        checked={lsReader.showFurigana()}
                        onChange={(e) => console.log("show furigana", e.target)}
                    />
                    <span>Show Furigana</span>
                </div>
            </div>

            {/* Padding Controls */}
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <LabeledSlider label="Vertical Padding (%)" unit="%" />
                <LabeledSlider label="Horizontal Padding (%)" unit="%" />
            </div>
        </div>
    )
}
