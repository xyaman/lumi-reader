import { JSX } from "solid-js"

type SectionProps = {
    children: JSX.Element
}

function Navbar(props: SectionProps) {
    return (
        <nav class="fixed top-0 left-0 w-full h-14 bg-white dark:bg-gray-900 backdrop-blur-md shadow-md text-gray-900 dark:text-white px-4 z-30 flex items-center justify-between transition-all duration-300">
            {props.children}
        </nav>
    )
}

function Left(props: SectionProps) {
    return <div class="flex items-center space-x-4">{props.children}</div>
}

function Right(props: SectionProps) {
    return <div class="flex items-center space-x-4 ml-auto">{props.children}</div>
}

Navbar.Left = Left
Navbar.Right = Right

export default Navbar
