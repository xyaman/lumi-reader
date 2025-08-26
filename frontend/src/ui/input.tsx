import { JSX } from "solid-js"
export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {}

export function Input(props: InputProps) {
    return (
        <input
            class="w-full px-4 py-2 border border-base03 bg-base00 text-base05 placeholder-base04 rounded-md focus:outline-none focus:ring-2 focus:ring-base0D transition-all duration-150"
            {...props}
        />
    )
}
