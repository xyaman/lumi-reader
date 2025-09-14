export type CheckboxProps = {
    class?: string
    checked?: boolean
    onChange: (e: Event) => void
}
export function Checkbox(props: CheckboxProps) {
    return (
        <label class={`relative items-center cursor-pointer ${props.class}`}>
            <input type="checkbox" class="sr-only peer" checked={props.checked} onChange={props.onChange} />
            <div class="w-11 h-6 bg-base04 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-base05 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-base05 after:border-base05 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-base0D" />
        </label>
    )
}
