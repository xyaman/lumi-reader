import { Show } from "solid-js"
import Navbar from "@/components/Navbar"
import { readerStore, setReaderStore } from "@/stores/readerStore"
import {
    IconBookmark,
    IconExit,
    IconFullscreen,
    IconSettings,
    IconToc,
    IconWindowed,
} from "@/components/icons"
import { useNavigate } from "@solidjs/router"

export default function ReaderNavbar() {
    const navigate = useNavigate()
    const isFullscreen = () => document.fullscreenElement != null

    return (
        <>
            <button
                onClick={() => {
                    setReaderStore("navOpen", true)
                    setReaderStore("sideLeft", null)
                }}
                class="fixed top-0 left-0 right-0 h-12 z-10 bg-transparent cursor-pointer"
            />
            <Show when={readerStore.navOpen}>
                <Navbar>
                    <Navbar.Left>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                setReaderStore("sideLeft", "toc")
                                setReaderStore("navOpen", false)
                            }}
                        >
                            <IconToc />
                        </button>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                setReaderStore("sideLeft", "bookmarks")
                                setReaderStore("navOpen", false)
                            }}
                        >
                            <IconBookmark />
                        </button>
                    </Navbar.Left>
                    <Navbar.Right>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                if (isFullscreen()) {
                                    document.exitFullscreen()
                                } else {
                                    document.documentElement.requestFullscreen()
                                }
                                setReaderStore("navOpen", false)
                            }}
                        >
                            <Show when={isFullscreen()} fallback={<IconFullscreen />}>
                                <IconWindowed />
                            </Show>
                        </button>
                        <button
                            class="cursor-pointer"
                            onClick={() => {
                                setReaderStore("sideLeft", null)
                                setReaderStore("settingsOpen", true)
                            }}
                        >
                            <IconSettings />
                        </button>
                        <button class="cursor-pointer" onClick={() => navigate("/")}>
                            <IconExit />
                        </button>
                    </Navbar.Right>
                </Navbar>
            </Show>
        </>
    )
}
