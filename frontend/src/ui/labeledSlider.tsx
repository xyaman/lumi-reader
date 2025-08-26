import { createSignal } from "solid-js"

type SliderProps = {
    label: string
    min?: number
    max?: number
    step?: number
    value?: number
    unit?: string
    onChange?: (val: number) => void
}

export function LabeledSlider(props: SliderProps) {
    const [val, setVal] = createSignal(props.value ?? 0)

    const handleInput = (e: Event) => {
        const newVal = parseFloat((e.target as HTMLInputElement).value)
        setVal(newVal)
        props.onChange?.(newVal)
    }

    return (
        <div class="space-y-2">
            <label class="block text-base05">{props.label}</label>
            <div class="flex items-center space-x-4">
                <input
                    type="range"
                    min={props.min ?? 0}
                    max={props.max ?? 50}
                    step={props.step ?? 1}
                    value={val()}
                    onInput={handleInput}
                    class="flex-1 appearance-none h-1 rounded bg-base02 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-base0D [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-base0D [&::-moz-range-thumb]:cursor-pointer"
                />
                <span class="text-base05 w-12 text-center font-mono">
                    {val()}
                    {props.unit ?? ""}
                </span>
            </div>
        </div>
    )
}
