import { JSX, ParentProps, splitProps } from "solid-js"

export type ButtonProps = ParentProps<
    JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: "primary" | "secondary" | "danger"
        disabled?: boolean
        size?: "sm" | "md" | "lg"
    }
>

export function Button(props: ButtonProps) {
    const [local, otherProps] = splitProps(props, ["variant", "size"])

    const colors = {
        primary: "bg-base02 hover:bg-base03 text-base05",
        secondary: "bg-base01 hover:bg-base03 text-base05",
        danger: "bg-base08 hover:bg-base09 text-base05",
    }

    const baseStyle = "cursor-pointer rounded-md"
    const size = {
        sm: "py-1 px-3 text-sm",
        md: "py-2 px-4 text-base",
        lg: "py-3 px-6 text-lg",
    }

    const colorsStyle = colors[local.variant ?? "primary"]
    const sizeStyle = local.size ? size[local.size] : "py-2 px-4"

    // reactive
    const disabledStyle = () => (otherProps.disabled ? "opacity-50 cursor-not-allowed" : "")

    const style = () => [baseStyle, colorsStyle, sizeStyle, disabledStyle()].join(" ").trim()

    return (
        <button class={style()} {...otherProps}>
            {props.children}
        </button>
    )
}
