import { useLibraryDispatch } from "@/context/library"
import { IconCloud, IconUpload } from "@/components/icons"
import { BooksGrid, SortPopover } from "@/components/home/library"
import { Button } from "@/ui"
import { useNavigate } from "@solidjs/router"
import { useAuthState } from "@/context/auth"

export function Library() {
    const libraryDispatch = useLibraryDispatch()
    const authState = useAuthState()
    const navigate = useNavigate()

    const handleUpload = async (e: Event) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        await libraryDispatch.createBook(files)
    }

    return (
        <>
            <header class="mb-8">
                <div class="flex flex-col md:flex-row justify-between">
                    <h1 class="text-3xl font-bold mb-2 md:mb-0">Your Library</h1>
                    <div class="flex space-y-2 md:space-y-0 md:space-x-2 ml-auto">
                        {/* Sync button */}
                        <Button
                            onClick={() => navigate("/syncbooks")}
                            class="max-h-[40px] flex items-center"
                            classList={{ "hover:bg-base02!": !authState.user }}
                            disabled={!authState.user}
                        >
                            <IconCloud />
                            <span class="ml-2">Sync</span>
                        </Button>

                        {/* Upload button  */}
                        <label class="max-h-[40px] cursor-pointer relative rounded-md bg-base02 hover:bg-base03 px-4 py-2 flex items-center">
                            <input
                                type="file"
                                accept=".epub"
                                multiple
                                onInput={handleUpload}
                                class="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <IconUpload />
                            <span class="cursor-pointer ml-2">Upload</span>
                        </label>

                        {/* Sort button */}
                        <SortPopover />
                    </div>
                </div>
            </header>

            <BooksGrid />
        </>
    )
}
