import { Show } from "solid-js"
import Navbar from "@/components/Navbar"
import {
    IconClock,
    IconBookmark,
    IconBookmarkSquare,
    IconExit,
    IconFullscreen,
    IconSettings,
    IconToc,
    IconWindowed,
} from "@/components/icons"
import { useNavigate } from "@solidjs/router"
import { useReaderDispatch, useReaderState } from "@/context/reader"

/**
 * ReaderNavbar component for `BookReader`
 * Displays navigation buttons for table of contents, bookmarks, etc.
 * Hidden by default, is shown when user clicks the top side of the reader
 */
export default function ReaderNavbar() {
    const navigate = useNavigate()
    const isFullscreen = () => document.fullscreenElement != null

    const readerStore = useReaderState()
    const readerDispatch = useReaderDispatch()

    const goToLastBookmark = () => {
        const bookmarks = readerStore.book.bookmarks
        if (bookmarks.length === 0) return
        const lastBookmark = bookmarks[bookmarks.length - 1]
        readerDispatch.bookmarkGoTo(lastBookmark)
    }

    return (
        <>
            <button
                onClick={() => readerDispatch.openNavbar()}
                class="fixed top-0 left-0 right-0 h-12 z-10 bg-transparent cursor-pointer"
            />
            <Show when={readerStore.navOpen}>
                <Navbar fixed disableCollapse>
                    <Navbar.Left>
                        <button class="cursor-pointer" onClick={() => readerDispatch.setSidebar("toc")}>
                            <IconToc />
                        </button>
                        <button class="cursor-pointer" onClick={() => readerDispatch.setSidebar("bookmarks")}>
                            <IconBookmark />
                        </button>
                        <Show when={readerStore.book.bookmarks.length > 0}>
                            <button class="cursor-pointer" onClick={() => goToLastBookmark()}>
                                <IconBookmarkSquare />
                            </button>
                        </Show>
                        <button class="cursor-pointer" onClick={() => readerDispatch.setSidebar("session")}>
                            <IconClock />
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
                                readerDispatch.closeNavbar()
                            }}
                        >
                            <Show when={isFullscreen()} fallback={<IconFullscreen />}>
                                <IconWindowed />
                            </Show>
                        </button>
                        <button class="cursor-pointer" onClick={() => readerDispatch.setSidebar("settings")}>
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
