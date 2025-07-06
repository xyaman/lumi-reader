import {
    createContext,
    createEffect,
    createSignal,
    JSX,
    onCleanup,
    Show,
    useContext,
} from "solid-js"
import { Portal } from "solid-js/web"

type SectionProps = {
    title?: string
    children: JSX.Element
    fixed?: boolean
    disableCollapse?: boolean
}

type NavbarContextType = {
    title?: string
    mobileOpen: () => boolean
    openMenu: () => void
    closeMenu: () => void
    disableCollapse?: boolean
}

const NavbarContext = createContext<NavbarContextType>()

function Navbar(props: SectionProps) {
    const isFixed = props.fixed ?? false
    const [mobileOpen, setMobileOpen] = createSignal(false)
    const openMenu = () => setMobileOpen(true)
    const closeMenu = () => setMobileOpen(false)

    createEffect(() => {
        if (mobileOpen()) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
    })

    onCleanup(() => {
        document.body.style.removeProperty("overflow")
    })

    return (
        <NavbarContext.Provider
            value={{
                title: props.title,
                mobileOpen,
                openMenu,
                closeMenu,
                disableCollapse: props.disableCollapse,
            }}
        >
            <nav
                class={`navbar-theme top-0 left-0 w-full h-14 backdrop-blur-md shadow-md px-4 z-30 flex items-center justify-between transition-all duration-300`}
                classList={{ fixed: isFixed }}
            >
                {props.children}
            </nav>
        </NavbarContext.Provider>
    )
}

function Left(props: SectionProps) {
    const navbar = useContext(NavbarContext)
    return (
        <div class="flex items-center space-x-4">
            <Show when={!navbar?.disableCollapse}>
                <button
                    class="button md:hidden p-2"
                    onClick={navbar?.openMenu}
                    aria-label="Open menu"
                >
                    <svg width="24" height="24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </Show>
            {props.children}
        </div>
    )
}
function Right(props: SectionProps) {
    const navbar = useContext(NavbarContext)
    const isOpen = navbar?.mobileOpen

    return (
        <>
            <div
                class="items-center space-x-4 ml-auto"
                classList={{
                    "hidden md:flex": !navbar?.disableCollapse,
                    flex: navbar?.disableCollapse,
                }}
            >
                {props.children}
            </div>

            <Show when={!navbar?.disableCollapse}>
                <Portal>
                    {/* Backdrop */}
                    <div
                        class="fixed inset-0 z-[99] md:hidden transition-opacity duration-300 ease-in-out"
                        classList={{
                            "bg-black/50 opacity-100 pointer-events-auto": isOpen?.(),
                            "opacity-0 pointer-events-none": !isOpen?.(),
                        }}
                        onClick={navbar?.closeMenu}
                    />

                    {/* Slide-in menu */}
                    <div
                        class="navbar-theme fixed top-0 left-0 h-screen w-64 z-[100] transition-transform duration-300 ease-in-out md:hidden"
                        classList={{
                            "translate-x-0": isOpen?.(),
                            "-translate-x-full": !isOpen?.(),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="flex flex-col h-full p-4">
                            {/* Header with title and close button */}
                            <div class="flex items-center justify-between">
                                <h2 class="text-lg font-semibold">{navbar?.title}</h2>
                                <button
                                    class="button p-2 transition"
                                    onClick={navbar?.closeMenu}
                                    aria-label="Close menu"
                                >
                                    <svg width="24" height="24" fill="none" stroke="currentColor">
                                        <path
                                            stroke-linecap="round"
                                            stroke-width="2"
                                            d="M6 6l12 12M6 18L18 6"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Menu items */}
                            <div class="navbar-theme mt-6 flex flex-col space-y-4">
                                {props.children}
                            </div>
                        </div>
                    </div>
                </Portal>
            </Show>
        </>
    )
}

Navbar.Left = Left
Navbar.Right = Right

export default Navbar
