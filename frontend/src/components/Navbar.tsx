import { JSX } from "solid-js"

type SectionProps = {
    children: JSX.Element
}

function Navbar(props: SectionProps) {
    return (
        <nav class="navbar-theme fixed top-0 left-0 w-full h-14 backdrop-blur-md shadow-md px-4 z-30 flex items-center justify-between transition-all duration-300">
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
