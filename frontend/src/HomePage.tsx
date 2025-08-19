import Resizable from "@corvu/resizable"
import { createSignal, For, JSX, Show, onMount } from "solid-js"
import { A, useLocation } from "@solidjs/router"
import { IconCalendar, IconHome, IconSettings, IconUsers } from "./components/icons"
import SocialList from "./components/SocialList"
import Dialog from "@corvu/dialog"
import UserAvatar from "./components/UserAvatar"
import { useAuthState } from "./context/auth"
import { useIsMobile } from "./hooks"
import LibraryProvider, { useLibraryDispatch, useLibraryState } from "./context/library"

function AddShelfDialog() {
    const libraryDispatch = useLibraryDispatch()

    const [shelfName, setShelfName] = createSignal("")
    const { setOpen } = Dialog.useContext()

    onMount(() => {
        document.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return
            e.preventDefault()
            handleAdd().then(() => setOpen(false))
        })
    })

    // Add shelf to state
    const handleAdd = async () => {
        const name = shelfName().trim()
        if (!name) return

        await libraryDispatch.createShelf(name)
        setShelfName("")
    }

    return (
        <>
            <Dialog.Trigger class="cursor-pointer">+</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 bg-black/50" />
                <Dialog.Content class="fixed left-1/2 top-1/2 z-50 min-w-80 max-w-md -translate-x-1/2 -translate-y-1/2 rounded border border-base02 bg-base01 px-6 py-5 data-open:animate-in data-open:fade-in-0% data-open:zoom-in-95% data-open:slide-in-from-top-10% data-closed:animate-out data-closed:fade-out-0% data-closed:zoom-out-95% data-closed:slide-out-to-top-10%">
                    <Dialog.Label class="font-semibold">Add Bookshelf</Dialog.Label>
                    <input
                        class="mt-4 w-full p-2 border rounded border-base02"
                        placeholder="Shelf name"
                        value={shelfName()}
                        onInput={(e) => setShelfName(e.currentTarget.value)}
                    />
                    <div class="mt-6 flex justify-end space-x-2">
                        <Dialog.Close class="px-4 py-2 text-sm rounded-lg">Cancel</Dialog.Close>
                        <Dialog.Close
                            class="px-4 py-2 text-sm font-medium rounded-lg bg-base02 hover:bg-base0D hover:text-base00"
                            onClick={handleAdd}
                        >
                            Add
                        </Dialog.Close>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </>
    )
}

function Header() {
    const location = useLocation()
    const titles: Record<string, string> = {
        "/social": "Social activity",
    }

    const subtitle: Record<string, string | null> = {}

    return (
        <Show when={location.pathname in titles}>
            <header class="mb-8">
                <h1 class="text-3xl font-bold">{titles[location.pathname]}</h1>
                <p>{subtitle[location.pathname] || ""}</p>
            </header>
        </Show>
    )
}

function Sidebar() {
    const location = useLocation()

    const authState = useAuthState()
    const libraryState = useLibraryState()
    const libraryDispatch = useLibraryDispatch()

    return (
        <div class="bg-base01 border border-base02 h-full w-full">
            {/* User */}
            <Show
                when={authState.user}
                fallback={
                    <div class="p-4 border-b border-base02">
                        <A href="/register">
                            <h3 class="font-semibold text-base05">Welcome to Lumireader</h3>
                            <p class="text-xs text-base04">Sign in to access all features</p>
                        </A>
                    </div>
                }
            >
                <div class="p-2 border-b border-base02">
                    <div class="flex items-center space-x-3 p-2 rounded hover:bg-base02">
                        {/* User Avatar */}
                        <UserAvatar h={10} w={10} user={authState.user!} />
                        {/* Name  */}
                        <p class="font-semibold">{authState.user?.username}</p>
                    </div>
                </div>
            </Show>

            {/* Navigation */}
            <nav class="p-2 border-b border-base02">
                <ul>
                    <li
                        classList={{
                            "border-l-3 border-base0D": location.pathname === "/",
                        }}
                    >
                        <A href="/" class="flex hover:bg-base02 p-2 rounded">
                            <span class="mr-3">
                                <IconHome />
                            </span>
                            <span>Home</span>
                        </A>
                    </li>
                    <li
                        classList={{
                            "border-l-3 border-base0D": location.pathname === "/sessions",
                        }}
                    >
                        <A href="/sessions" class="flex items-center hover:bg-base02 p-2 rounded">
                            <span class="mr-3">
                                <IconCalendar />
                            </span>
                            <span>Sessions</span>
                        </A>
                    </li>
                    <li>
                        <A href="/settings" class="flex hover:bg-base02 p-2 rounded">
                            <span class="mr-3">
                                <IconSettings />
                            </span>
                            <span>Settings</span>
                        </A>
                    </li>
                </ul>
            </nav>

            {/* Shelves */}
            <div class="p-4 border-b border-base02">
                <div class="flex justify-between mb-2">
                    <h2 class="font-semibold">Your collections</h2>
                    <Dialog>
                        <AddShelfDialog />
                    </Dialog>
                </div>
                <ul>
                    <li classList={{ "border-l-3 border-base0D": libraryState.activeShelf === null }}>
                        <button
                            class="w-full flex cursor-pointer rounded p-2 hover:bg-base02"
                            onClick={() => libraryDispatch.setActiveShelf(null)}
                        >
                            <p>All Books</p>
                        </button>
                    </li>
                    <For each={libraryState.shelves}>
                        {(shelf) => (
                            <li
                                classList={{
                                    "border-l-3 border-base0D": libraryState.activeShelf === shelf.id,
                                }}
                            >
                                <button
                                    class="w-full flex cursor-pointer rounded p-2 hover:bg-base02"
                                    onClick={() => libraryDispatch.setActiveShelf(shelf.id)}
                                >
                                    <p>{shelf.name}</p>
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </div>

            {/* Social */}
            <div class="p-4">
                <h2 class="font-semibold mb-2">Social Activity</h2>
                <SocialList />
            </div>
        </div>
    )
}

export default function HomePage(props: { children?: JSX.Element }) {
    const isMobile = useIsMobile()
    const location = useLocation()

    return (
        <LibraryProvider>
            <Show
                when={isMobile()}
                fallback={
                    <div class="size-full">
                        <Resizable class="size-full">
                            <Resizable.Panel initialSize={0.2} minSize={0.1} class="overflow-hidden">
                                <Sidebar />
                            </Resizable.Panel>
                            <Resizable.Handle class="group basis-3 px-0.75">
                                <div class="size-full rounded-sm transition-colors group-data-active:bg-base02 group-data-dragging:bg-base03" />
                            </Resizable.Handle>
                            <Resizable.Panel
                                initialSize={0.8}
                                minSize={0.7}
                                class="overflow-y-auto"
                                id="main-container"
                            >
                                <div class="p-10">{props.children}</div>
                            </Resizable.Panel>
                        </Resizable>
                    </div>
                }
            >
                {/* Mobile version */}
                <div id="main-container" class="p-10 overflow-auto" style={{ height: "calc(100vh - 60px)" }}>
                    <Header />
                    {props.children}
                </div>
                <div
                    class="fixed bottom-0 left-0 right-0 bg-base01 border-t border-base02 flex justify-around items-center p-2 md:hidden"
                    style={{ height: "56px" }}
                >
                    <A href="/" class="p-2" classList={{ "text-base0D": location.pathname === "/" }}>
                        <IconHome />
                    </A>
                    <A href="/sessions" class="p-2" classList={{ "text-base0D": location.pathname === "/sessions" }}>
                        <IconCalendar />
                    </A>
                    <A href="/social" class="p-2" classList={{ "text-base0D": location.pathname === "/social" }}>
                        <IconUsers />
                    </A>
                    <A href="/settings" class="p-2" classList={{ "text-base0D": location.pathname === "/settings" }}>
                        <IconSettings />
                    </A>
                </div>
            </Show>
        </LibraryProvider>
    )
}
