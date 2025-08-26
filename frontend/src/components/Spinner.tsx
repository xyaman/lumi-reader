type Props = {
    size: number
    base16Color: string
}

export default function Spinner(props: Props) {
    const size = props.size
    const color = `var(${props.base16Color})`

    return (
        <svg
            class="animate-spin"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                stroke: color,
                fill: color,
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <circle class="opacity-25" cx="12" cy="12" r="10" />
            <path class="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
    )
}
