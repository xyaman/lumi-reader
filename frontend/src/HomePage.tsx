import Resizable from "@corvu/resizable"
import { useAuthContext } from "./context/session"
import { onCleanup, createSignal, For, JSX, Show } from "solid-js"
import { A, useLocation } from "@solidjs/router"
import { IconCalendar, IconHome, IconSettings, IconUsers } from "./components/icons"
import { LibraryProvider, useLibraryContext } from "./context/library"
import SocialList from "./components/SocialList"

function useIsMobile() {
    const [isMobile, setIsMobile] = createSignal(window.innerWidth <= 768)
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", handler)
    onCleanup(() => window.removeEventListener("resize", handler))
    return isMobile
}

function Header() {
    const location = useLocation()
    const titles: Record<string, string> = {
        "/": "Your Library",
        "/sessions": "Reading sessions",
        "/social": "Social activity",
    }

    const subtitle: Record<string, string | null> = {
        "/": null,
        "/sessions": "Manage your reading progress",
    }

    return (
        <header class="mb-8">
            <h1 class="text-3xl font-bold">{titles[location.pathname]}</h1>
            <p>{subtitle[location.pathname] || ""}</p>
        </header>
    )
}

function Sidebar() {
    const location = useLocation()

    const { sessionStore } = useAuthContext()
    const { state } = useLibraryContext()
    return (
        <div class="bg-base01 border border-base02 h-full w-full">
            {/* User */}
            <Show
                when={sessionStore.user}
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
                        <Show
                            when={sessionStore.user?.avatar_url}
                            fallback={
                                <div class="bg-(--base01) w-8 h-8 rounded-full flex items-center">
                                    <span class="text-xs font-medium">
                                        {sessionStore.user?.username.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            }
                        >
                            <img
                                src={sessionStore.user?.avatar_url}
                                class="w-10 h-10 rounded-full"
                                alt="User avatar"
                            />
                        </Show>
                        {/* Name  */}
                        <p class="font-semibold">{sessionStore.user?.username}</p>
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
                    <button class="cursor-pointer">+</button>
                </div>
                <ul>
                    <li classList={{ "border-l-3 border-base0D": state.activeShelf === null }}>
                        <button class="w-full flex cursor-pointer rounded p-2 hover:bg-base02">
                            <p>All Books</p>
                        </button>
                    </li>
                    <For each={state.shelves}>
                        {(shelf) => (
                            <li
                                classList={{
                                    "border-l-3 border-base0D": state.activeShelf === shelf.id,
                                }}
                            >
                                <button class="w-full flex cursor-pointer rounded p-2 hover:bg-base02">
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
                            <Resizable.Panel
                                initialSize={0.2}
                                minSize={0.1}
                                class="overflow-hidden"
                            >
                                <Sidebar />
                            </Resizable.Panel>
                            <Resizable.Handle class="group basis-3 px-0.75">
                                <div class="size-full rounded-sm transition-colors group-data-active:bg-base02 group-data-dragging:bg-base03" />
                            </Resizable.Handle>
                            <Resizable.Panel initialSize={0.8} minSize={0.7}>
                                <div class="p-10">{props.children}</div>
                            </Resizable.Panel>
                        </Resizable>
                    </div>
                }
            >
                {/* Mobile version */}
                <div class="p-10">
                    <Header />
                    {props.children}
                </div>
                <div class="fixed bottom-0 left-0 right-0 bg-base01 border-t border-base02 flex justify-around items-center p-2 md:hidden">
                    <A
                        href="/"
                        class="p-2"
                        classList={{ "text-base0D": location.pathname === "/" }}
                    >
                        <IconHome />
                    </A>
                    <A
                        href="/sessions"
                        class="p-2"
                        classList={{ "text-base0D": location.pathname === "/sessions" }}
                    >
                        <IconCalendar />
                    </A>
                    <A
                        href="/social"
                        class="p-2"
                        classList={{ "text-base0D": location.pathname === "/social" }}
                    >
                        <IconUsers />
                    </A>
                    <A
                        href="/settings"
                        class="p-2"
                        classList={{ "text-base0D": location.pathname === "/settings" }}
                    >
                        <IconSettings />
                    </A>
                </div>
            </Show>
        </LibraryProvider>
    )
}
