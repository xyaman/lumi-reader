import { createReaderSettings } from "@/hooks"
import { Button, Input, LabeledSlider } from "@/ui"
import { Checkbox } from "@/ui"
import { Show } from "solid-js"

export function ReaderSettings(props: { isEmbedded?: boolean }) {
    const [settings, setSettings, reflectChanges] = createReaderSettings()

    // computed at creation time
    const checkboxGridClass = props.isEmbedded
        ? "mt-4 grid grid-cols-1 gap-4"
        : "mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
    const slidersGridClass = props.isEmbedded ? "mt-4 grid gap-6" : "mt-4 grid grid-cols-1 md:grid-cols-2 gap-6"

    return (
        <div>
            <div class="space-y-6">
                {/* Font size */}
                <div class="space-y-2">
                    <label class="block">Font Size (px)</label>
                    <div class="relative">
                        <Input
                            type="number"
                            min="1"
                            value={settings().fontSize}
                            onChange={(e) => setSettings("fontSize", Number(e.target.value))}
                        />
                        <span class="absolute right-3 top-2">px</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block">Line Height</label>
                    <div class="relative">
                        <Input
                            type="number"
                            min="1"
                            step="0.1"
                            value={settings().lineHeight}
                            onChange={(e) => setSettings("lineHeight", Number(e.target.value))}
                        />
                        <span class="absolute right-3 top-2">units</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="block">Font Family</label>
                    <div class="relative">
                        <Input
                            type="text"
                            value={settings().fontFamily ?? "__default__"}
                            onChange={(e) => setSettings("fontFamily", e.target.value)}
                        />
                    </div>
                </div>
            </div>

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

                <div class="space-y-2 border-t-1 border-base04 pt-2">
                    <div class="flex space-x-2">
                        <Checkbox
                            checked={settings().disableCss}
                            onChange={() => setSettings("disableCss", !settings().disableCss)}
                        />
                        <span>Disable CSS Injection</span>
                    </div>
                    <span class="text-xs text-base04">This might solve errors with some books.</span>
                </div>
            </div>

            {/* Padding Controls */}
            <div class={slidersGridClass}>
                <LabeledSlider
                    label="Vertical Padding (%)"
                    unit="%"
                    value={settings().verticalPadding}
                    onChange={(v) => setSettings("verticalPadding", v)}
                />
                <LabeledSlider
                    label="Horizontal Padding (%)"
                    unit="%"
                    value={settings().horizontalPadding}
                    onChange={(v) => setSettings("horizontalPadding", v)}
                />
            </div>

            {/* Save button only shown when embedded */}
            <Show when={props.isEmbedded}>
                <Button classList={{ "mt-4": true }} onClick={reflectChanges}>
                    Reflect changes now
                </Button>
            </Show>
        </div>
    )
}
