import { ThemeProvider } from "@/context/theme"

import ReaderSettings from "./ReaderSettings"
import Sidebar from "./Sidebar"
import ThemeList from "./Themelist"
import { useReaderContext } from "@/context/reader"

export function SettingsSidebar() {
    const { readerStore, setReaderStore } = useReaderContext()
    return (
        <Sidebar
            side="right"
            overlay
            title="Settings"
            open={readerStore.sideBar == "settings"}
            onClose={() => setReaderStore("sideBar", null)}
        >
            <div class="space-y-4">
                {/* TODO: only reload if changed pagination, vertical etc */}
                <ReaderSettings onSave={() => setReaderStore("shouldReload", true)} />
                <ThemeProvider>
                    <ThemeList selectOnly />
                </ThemeProvider>
            </div>
        </Sidebar>
    )
}
