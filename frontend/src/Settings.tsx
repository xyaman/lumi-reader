import { createEffect, createSignal, For, Show } from "solid-js"
import {
    ITheme,
    defaultThemes,
    getCustomThemes,
    saveCustomThemes,
    setGlobalTheme,
    getSelectedTheme,
} from "./theme"
import Navbar from "./components/Navbar"
import { IconExit, IconToc } from "./components/icons"
import { useNavigate } from "@solidjs/router"

type Base16Key = keyof ITheme
const base16Keys: Base16Key[] = Array.from(
    { length: 16 },
    (_, i) => `base0${i.toString(16).toUpperCase()}` as Base16Key,
)

const emptyTheme: ITheme = {
    scheme: "",
    author: "",
    base00: "#ffffff",
    base01: "#e0e0e0",
    base02: "#d0d0d0",
    base03: "#b0b0b0",
    base04: "#505050",
    base05: "#000000",
    base06: "#202020",
    base07: "#101010",
    base08: "#ab4642",
    base09: "#dc9656",
    base0A: "#f7ca88",
    base0B: "#a1b56c",
    base0C: "#86c1b9",
    base0D: "#7cafc2",
    base0E: "#ba8baf",
    base0F: "#a16946",
}

const themeDesc = {
    scheme: "name",
    author: "author",
    base00: "background",
    base01: "lighter background",
    base02: "border, cards",
    base03: "muted",
    base04: "secondary text",
    base05: "primary text",
    base06: "lighter text (inverse bg)",
    base07: "hover background",
    base08: "red",
    base09: "orange",
    base0A: "yellow",
    base0B: "green",
    base0C: "cyan",
    base0D: "blue",
    base0E: "purple",
    base0F: "brown",
}

const isValidHexColor = (val: string) => /^#[0-9a-fA-F]{6}$/.test(val)

const themeToYAML = (theme: ITheme) =>
    Object.entries(theme)
        .map(([k, v]) => `  ${k}: "${v}"`)
        .join("\n")

const parseSimpleYaml = (yaml: string): Partial<ITheme> => {
    const obj: Partial<ITheme> = {}
    yaml.split("\n").forEach((line) => {
        const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*"?([^"]*)"?\s*$/)
        if (match) obj[match[1] as keyof ITheme] = match[2]
    })
    return obj
}

export function ThemeList(props: {
    customThemes: ITheme[]
    onRemove?: (name: string) => void
    onEdit?: (theme: ITheme) => void
    onDuplicate?: (theme: ITheme) => void
}) {
    const [selectedTheme, setSelectedTheme] = createSignal(getSelectedTheme())

    const handleSelect = (name: string) => {
        setSelectedTheme(name)
        setGlobalTheme(name)
    }

    // Helper to check if a theme is default
    const isDefaultTheme = (scheme: string) => defaultThemes.some((t) => t.scheme === scheme)

    return (
        <div>
            <h3 class="text-lg font-medium mb-2">Available Themes</h3>
            <For each={[...defaultThemes, ...props.customThemes]}>
                {(theme) => (
                    <div
                        class={`flex items-center justify-between p-3 my-2 rounded border ${
                            selectedTheme() === theme.scheme ? "border-blue-600" : "border-zinc-600"
                        }`}
                    >
                        <span>{theme.scheme}</span>
                        <div class="flex gap-2">
                            <button
                                class="ml-2 text-sm text-blue-400 hover:underline"
                                onClick={() => handleSelect(theme.scheme)}
                                disabled={selectedTheme() === theme.scheme}
                            >
                                {selectedTheme() === theme.scheme ? "Selected" : "Select"}
                            </button>
                            {/* Duplicate button for all themes */}
                            <Show when={props.onDuplicate !== undefined}>
                                <button
                                    class="ml-2 text-sm text-green-400 hover:underline"
                                    onClick={() => props.onDuplicate?.(theme)}
                                >
                                    Duplicate
                                </button>
                            </Show>
                            {/* Only show edit/remove for custom themes */}
                            <Show when={!isDefaultTheme(theme.scheme) && props.onEdit}>
                                <button
                                    class="ml-2 text-sm text-yellow-400 hover:underline"
                                    onClick={() => props.onEdit?.(theme)}
                                >
                                    Edit
                                </button>
                            </Show>
                            <Show when={!isDefaultTheme(theme.scheme) && props.onRemove}>
                                <button
                                    class="ml-2 text-sm text-red-400 hover:underline"
                                    onClick={() => {
                                        if (theme.scheme == getSelectedTheme()) {
                                            setSelectedTheme("Minimal white")
                                        }
                                        props.onRemove?.(theme.scheme)
                                    }}
                                >
                                    Remove
                                </button>
                            </Show>
                        </div>
                    </div>
                )}
            </For>
        </div>
    )
}

function NewThemeEditor(props: {
    initialTheme?: ITheme
    mode?: "create" | "edit"
    onClose: () => void
    onSave?: (theme: ITheme, oldName?: string) => void
}) {
    const [form, setForm] = createSignal<ITheme>(
        props.initialTheme ? { ...props.initialTheme } : emptyTheme,
    )
    const [yamlString, setYamlString] = createSignal(themeToYAML(form()))
    const [yamlError, setYamlError] = createSignal<string | null>(null)
    const originalName = props.initialTheme?.scheme ?? ""

    createEffect(() => setYamlString(themeToYAML(form())))

    // Handlers
    const handleFormChange = (key: keyof ITheme, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleBase16Change = (key: Base16Key, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleYamlChange = (e: Event) => {
        const value = (e.target as HTMLTextAreaElement).value
        setYamlString(value)
        try {
            const parsed = parseSimpleYaml(value)
            for (const key of base16Keys) {
                const color = parsed[key]
                if (color !== undefined && !isValidHexColor(color)) {
                    setYamlError(`Invalid color for ${key}: "${color}"`)
                    return
                }
            }
            if (!parsed.scheme) {
                setYamlError("YAML must include a 'scheme' key")
                return
            }
            setForm((prev) => ({ ...prev, ...parsed }))
            setYamlError(null)
        } catch {
            setYamlError("Invalid YAML format")
        }
    }

    const handleFormSubmit = (e: Event) => {
        e.preventDefault()
        const theme = form()
        if (!theme.scheme.trim()) return
        if (props.mode === "edit") {
            // Update existing theme
            props.onSave?.(theme, originalName)
        } else {
            // Create new theme
            props.onSave?.(theme)
            setForm(emptyTheme)
        }
        props.onClose()
    }

    return (
        <form onSubmit={handleFormSubmit} class="navbar-theme p-4 rounded-lg">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">
                    {props.mode === "edit" ? "Edit Theme" : "New Theme"}
                </h3>
                <button
                    type="button"
                    class="button-theme cursor-pointer text-sm px-4 py-2 rounded-lg"
                    onClick={props.onClose}
                >
                    ← Back
                </button>
            </div>
            <div class="mb-3">
                <label class="block text-sm mb-1">Name:</label>
                <input
                    type="text"
                    value={form().scheme}
                    onInput={(e) => handleFormChange("scheme", e.currentTarget.value)}
                    required
                    class="w-full p-2 rounded bg-zinc-800 border border-zinc-600"
                />
            </div>
            <div class="mb-3">
                <label class="block text-sm mb-1">Author:</label>
                <input
                    type="text"
                    value={form().author}
                    onInput={(e) => handleFormChange("author", e.currentTarget.value)}
                    required
                    class="w-full p-2 rounded bg-zinc-800 border border-zinc-600"
                />
            </div>
            <div class="flex flex-col md:flex-row gap-6">
                {/* Left: Color pickers */}
                <div class="flex-1">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-4">
                        <For each={base16Keys}>
                            {(key) => (
                                <div class="flex items-center justify-between gap-4">
                                    <label class="text-sm w-48 truncate" title={themeDesc[key]}>
                                        {key}: <span class="text-zinc-400">({themeDesc[key]})</span>
                                    </label>
                                    <input
                                        type="color"
                                        value={form()[key]}
                                        onInput={(e) =>
                                            handleBase16Change(key, e.currentTarget.value)
                                        }
                                        class="w-8 h-8 bg-transparent border-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </For>
                    </div>
                </div>

                {/* Right: YAML textarea */}
                <div class="flex-1">
                    <label class="block mb-1 font-semibold text-sm">YAML Editor:</label>
                    <textarea
                        class="body-theme h-full min-h-[200px] p-2 rounded text-xs w-full h-40"
                        value={yamlString()}
                        onInput={handleYamlChange}
                    />
                    {yamlError() && <div class="text-red-500 text-xs mt-1">{yamlError()}</div>}
                </div>
            </div>
            <div class="space-x-2 mb-4">
                <button type="submit" class="button-theme px-4 py-2 rounded">
                    {props.mode === "edit" ? "Save" : "Create"}
                </button>
                <button
                    type="button"
                    class="button-theme px-4 py-2 rounded"
                    onClick={props.onClose}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}

export default function ThemeSettings() {
    const navigate = useNavigate()

    // Sidebar/menu state
    const [selectedMenu, setSelectedMenu] = createSignal<"theme" | "reader">("theme")
    const [showSidebar, setShowSidebar] = createSignal(false)

    // Theme state
    const [customThemes, setCustomThemes] = createSignal<ITheme[]>(getCustomThemes())
    const [editorMode, setEditorMode] = createSignal<null | {
        mode: "create" | "edit"
        theme?: ITheme
    }>(null)

    const handleSaveTheme = (theme: ITheme, oldName?: string) => {
        let updated = getCustomThemes()
        if (editorMode()?.mode === "edit" && oldName) {
            updated = updated.map((t) => (t.scheme === oldName ? theme : t))
        } else {
            updated = [...updated, theme]
        }
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    const handleDuplicate = (theme: ITheme) => {
        const existing = getCustomThemes()
        let baseName = `${theme.scheme} (copy)`
        let name = baseName
        let count = 2
        while (existing.some((t) => t.scheme === name)) {
            name = `${theme.scheme} (copy ${count})`
            count++
        }
        const newTheme = { ...theme, scheme: name }
        const updated = [...existing, newTheme]
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    const handleRemoveTheme = (scheme: string) => {
        if (scheme == getSelectedTheme()) {
            setGlobalTheme("Minimal white")
        }
        const updated = getCustomThemes().filter((t) => t.scheme !== scheme)
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    return (
        <>
            <Navbar>
                <Navbar.Left>
                    <button class="md:hidden mr-4" onClick={() => setShowSidebar((prev) => !prev)}>
                        <IconToc />
                    </button>
                    <p class="font-semibold text-lg">Settings</p>
                </Navbar.Left>
                <Navbar.Right>
                    <button onClick={() => navigate("/")}>
                        <IconExit />
                    </button>
                </Navbar.Right>
            </Navbar>
            <div class="mt-12 flex flex-col md:flex-row min-h-screen">
                <aside
                    class={`navbar-theme w-full md:w-64 p-4 md:block ${showSidebar() ? "block" : "hidden"}`}
                >
                    <ul class="space-y-2">
                        <li>
                            <button
                                class={`w-full text-left font-medium rounded px-2 py-1 ${
                                    selectedMenu() === "theme"
                                        ? "bg-[var(--base02)] text-[var(--base07)]"
                                        : "text-[var(--base04)] hover:text-[var(--base07)]"
                                }`}
                                onClick={() => {
                                    setSelectedMenu("theme")
                                    setShowSidebar(false)
                                }}
                            >
                                Theme Settings
                            </button>
                        </li>
                        <li>
                            <button
                                class={`w-full text-left font-medium rounded px-2 py-1 ${
                                    selectedMenu() === "reader"
                                        ? "bg-[var(--base02)] text-[var(--base07)]"
                                        : "text-[var(--base04)] hover:text-[var(--base07)]"
                                }`}
                                onClick={() => {
                                    setSelectedMenu("reader")
                                    setShowSidebar(false)
                                }}
                            >
                                Reader Settings
                            </button>
                        </li>
                    </ul>
                </aside>
                <main class="flex-1 p-6 md:p-12">
                    <div class="max-w-4xl mx-auto space-y-12">
                        <Show when={selectedMenu() === "theme"}>
                            <section>
                                <h2 class="text-2xl font-semibold mb-4">Theme Settings</h2>
                                <Show
                                    when={!editorMode()}
                                    fallback={
                                        <NewThemeEditor
                                            onClose={() => setEditorMode(null)}
                                            initialTheme={editorMode()?.theme}
                                            mode={editorMode()?.mode}
                                            onSave={handleSaveTheme}
                                        />
                                    }
                                >
                                    <>
                                        <button
                                            class="button-theme-alt cursor-pointer px-4 py-2 mt-2 mb-4 rounded-lg"
                                            onClick={() => setEditorMode({ mode: "create" })}
                                        >
                                            + New Theme
                                        </button>
                                        <ThemeList
                                            customThemes={customThemes()}
                                            onRemove={handleRemoveTheme}
                                            onDuplicate={handleDuplicate}
                                            onEdit={(theme) =>
                                                setEditorMode({ mode: "edit", theme })
                                            }
                                        />
                                    </>
                                </Show>
                            </section>
                        </Show>
                        <Show when={selectedMenu() === "reader"}>
                            <section>
                                <h2 class="text-2xl font-semibold">Reader Settings</h2>
                            </section>
                        </Show>
                    </div>
                </main>
            </div>
        </>
    )
}
