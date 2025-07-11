import { Show } from "solid-js"
import { IconClock, IconSettings, IconUpload } from "@/components/icons"
import Navbar from "@/components/Navbar"
import { A } from "@solidjs/router"

type BookLibraryNavbarProps = {
    handleUpload: (e: Event) => void
    user: () => any
}

export default function BookLibraryNavbar(props: BookLibraryNavbarProps) {
    const { handleUpload, user } = props
    return (
        <Navbar fixed title="lumireader">
            <Navbar.Left>
                <A
                    href="/"
                    class="text-xl font-bold text-[var(--base07)] hover:text-[var(--base0D)] transition-colors"
                >
                    lumireader
                </A>
            </Navbar.Left>
            <Navbar.Right>
                <label class="button relative px-3 py-2 rounded-lg cursor-pointer">
                    <IconUpload />
                    <span class="sr-only">Upload EPUB</span>
                    <input
                        type="file"
                        accept=".epub"
                        multiple
                        onInput={handleUpload}
                        class="absolute inset-0 opacity-0"
                    />
                </label>
                <A href="/sessions" class="button px-3 py-2 rounded-lg">
                    <IconClock />
                </A>
                <A href="/settings" class="button px-3 py-2 rounded-lg">
                    <IconSettings />
                </A>
                <Show
                    when={user()}
                    fallback={
                        <>
                            <A href="/login" class="button-theme px-3 py-2 rounded-lg">
                                Login
                            </A>
                            <A href="/register" class="button-theme px-3 py-2 rounded-lg">
                                Register
                            </A>
                        </>
                    }
                >
                    <A href="/users" class="button px-3 py-2 rounded-lg">
                        Profile
                    </A>
                </Show>
            </Navbar.Right>
        </Navbar>
    )
}
