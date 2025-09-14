import { createMemo, createSignal, For, Show } from "solid-js"
import { A, useLocation } from "@solidjs/router"
import { IconCalendar, IconHeart, IconHome, IconSettings } from "@/components/icons"
import SocialList from "@/components/SocialList"
import UserStatus from "@/components/UserStatus"
import { useAuthState } from "@/context/auth"
import { useLibraryDispatch, useLibraryState } from "@/context/library"
import { ShelfModal } from "./ShelfModal"
import { Bookshelf } from "@/db"

export function Sidebar() {
    const location = useLocation()
    const authState = useAuthState()
    const libraryState = useLibraryState()
    const libraryDispatch = useLibraryDispatch()

    // -- view route
    const activePath = createMemo(() => location.pathname)
    const navItems = [
        { href: "/", label: "Home", icon: IconHome },
        { href: "/patreon", label: "Patreon", icon: IconHeart },
        { href: "/sessions", label: "Sessions", icon: IconCalendar },
        { href: "/settings", label: "Settings", icon: IconSettings },
    ]

    // shelf modal
    const [shelfShowModal, setShowModal] = createSignal(false)
    const [shelfModal, setShelfModal] = createSignal<Bookshelf | null>(null)

    const createShelfModal = () => {
        setShelfModal(null)
        setShowModal(true)
    }

    const editShelfModal = (shelf: Bookshelf) => {
        setShelfModal(shelf)
        setShowModal(true)
    }

    const onModalDismiss = () => {
        setShelfModal(null)
        setShowModal(false)
    }

    return (
        <>
            <ShelfModal show={shelfShowModal()} shelf={shelfModal()} onDismiss={onModalDismiss} />
            <div class="bg-base01 border border-base02 h-full w-full">
                {/* User */}
                <Show
                    when={authState.user != null}
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
                            <UserStatus h={10} w={10} user={authState.user!} />
                            <A href="/me">
                                {/* Name  */}
                                <p class="font-semibold">{authState.user?.username}</p>
                            </A>
                        </div>
                    </div>
                </Show>

                {/* Navigation */}
                <nav class="p-2 border-b border-base02" aria-label="Main navigation">
                    <ul>
                        <For each={navItems}>
                            {(item) => (
                                <li
                                    classList={{
                                        "border-l-3 border-base0D": activePath() === item.href,
                                    }}
                                >
                                    <A href={item.href} class="flex hover:bg-base02 p-2 rounded">
                                        <span class="mr-3">{<item.icon />}</span>
                                        <span>{item.label}</span>
                                    </A>
                                </li>
                            )}
                        </For>
                    </ul>
                </nav>

                {/* Shelves */}
                <Show when={activePath() === "/"}>
                    <div class="p-4 border-b border-base02">
                        <div class="flex justify-between mb-2">
                            <h2 class="font-semibold">Your collections</h2>
                            <button onClick={createShelfModal}>+</button>
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
                                        <div
                                            class="relative w-full flex cursor-pointer rounded p-2 hover:bg-base02 group"
                                            onClick={() => libraryDispatch.setActiveShelf(shelf.id)}
                                        >
                                            <p>{shelf.name}</p>
                                            <button
                                                class="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    editShelfModal(shelf)
                                                }}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </div>
                </Show>

                {/* Social */}
                <Show when={authState.status == "authenticated"}>
                    <div class="p-4">
                        <SocialList />
                    </div>
                </Show>
            </div>
        </>
    )
}
