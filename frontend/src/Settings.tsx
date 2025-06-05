import { createSignal, For, Show } from "solid-js"
import {
    ITheme,
    defaultThemes,
    getCustomThemes,
    saveCustomThemes,
    setGlobalTheme,
    getSelectedTheme,
} from "./theme"
import Navbar from "./components/Navbar"

function emptyTheme(): ITheme {
    return {
        name: "",
        base16: {
            base00: "#ffffff", // background
            base01: "#e0e0e0", // navbar background
            base02: "#d0d0d0",
            base03: "#b0b0b0",
            base04: "#505050",
            base05: "#000000", // text
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
        },
    }
}

export default function ThemeSettings() {
    const [customThemes, setCustomThemes] = createSignal<ITheme[]>(getCustomThemes())
    const [selectedTheme, setSelectedTheme] = createSignal(getSelectedTheme())
    const [editing, setEditing] = createSignal<ITheme | null>(null)
    const [creating, setCreating] = createSignal(false)
    const [form, setForm] = createSignal<ITheme>(emptyTheme())

    function refreshThemes() {
        setCustomThemes(getCustomThemes())
    }

    function handleSelect(name: string) {
        setSelectedTheme(name)
        setGlobalTheme(name)
    }

    function handleEdit(theme: ITheme) {
        setEditing(theme)
        setForm({ ...theme, base16: { ...theme.base16 } })
    }

    function handleDelete(name: string) {
        const updated = customThemes().filter((t) => t.name !== name)
        saveCustomThemes(updated)
        refreshThemes()
        if (selectedTheme() === name) handleSelect(defaultThemes[0].name)
    }

    function handleFormChange<K extends keyof ITheme>(key: K, value: any) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    function handleBase16Change(key: keyof ITheme["base16"], value: string) {
        setForm((prev) => ({ ...prev, base16: { ...prev.base16, [key]: value } }))
    }

    function handleFormSubmit(e: Event) {
        e.preventDefault()
        const theme = form()
        if (!theme.name.trim()) return
        let updated = [...customThemes()]
        if (editing()) {
            updated = updated.map((t) => (t.name === editing()!.name ? theme : t))
        } else {
            updated.push(theme)
        }
        saveCustomThemes(updated)
        refreshThemes()
        setEditing(null)
        setCreating(false)
        setForm(emptyTheme())
    }

    function handleCreate() {
        setCreating(true)
        setEditing(null)
        setForm(emptyTheme())
    }

    function handleCancel() {
        setEditing(null)
        setCreating(false)
        setForm(emptyTheme())
    }

    const allThemes = () => [...defaultThemes, ...customThemes()]

    return (
        <>
            <Navbar>
                <Navbar.Left>
                    <p>Settings</p>
                </Navbar.Left>
            </Navbar>
            <div class="p-8 max-w-xl mx-auto">
                <h2>Theme Settings</h2>
                <button
                    class="p-1 pr-2 mt-4 mb-4 rounded-lg bg-zinc-700 text-white disabled:opacity-50"
                    onClick={handleCreate}
                    disabled={creating() || !!editing()}
                >
                    + Create Theme
                </button>
                <For each={allThemes()}>
                    {(theme) => (
                        <div
                            class={`flex justify-between p-4 my-2 rounded-lg border ${selectedTheme() === theme.name ? "border-blue-600" : "border-gray-300"}`}
                        >
                            <div>
                                <strong>Name: {theme.name}</strong>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "0.5rem",
                                        "margin-top": "0.5rem",
                                    }}
                                >
                                    <span
                                        style={{
                                            background: theme.base16.base00,
                                            color: theme.base16.base05,
                                            padding: "0.2rem 0.5rem",
                                            "border-radius": "4px",
                                        }}
                                    >
                                        BG
                                    </span>
                                    <span
                                        style={{
                                            background: theme.base16.base05,
                                            color: theme.base16.base00,
                                            padding: "0.2rem 0.5rem",
                                            "border-radius": "4px",
                                        }}
                                    >
                                        Text
                                    </span>
                                    <span
                                        style={{
                                            background: theme.base16.base01,
                                            color: "#fff",
                                            padding: "0.2rem 0.5rem",
                                            "border-radius": "4px",
                                        }}
                                    >
                                        Navbar
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                    onClick={() => handleSelect(theme.name)}
                                    disabled={selectedTheme() === theme.name}
                                >
                                    {selectedTheme() === theme.name ? "Selected" : "Select"}
                                </button>
                                <Show when={!defaultThemes.some((t) => t.name === theme.name)}>
                                    <button onClick={() => handleEdit(theme)}>Edit</button>
                                    <button
                                        onClick={() => handleDelete(theme.name)}
                                        style={{ color: "red" }}
                                    >
                                        Delete
                                    </button>
                                </Show>
                            </div>
                        </div>
                    )}
                </For>
                <Show when={creating() || editing()}>
                    <form
                        onSubmit={handleFormSubmit}
                        style={{
                            margin: "1rem 0",
                            padding: "1rem",
                            border: "1px solid #ccc",
                            "border-radius": "8px",
                        }}
                    >
                        <h3>{editing() ? `Edit ITheme: ${editing()!.name}` : "Create ITheme"}</h3>
                        <label>
                            Name:
                            <input
                                type="text"
                                value={form().name}
                                onInput={(e) => handleFormChange("name", e.currentTarget.value)}
                                required
                                disabled={!!editing()}
                            />
                        </label>
                        <div style={{ display: "flex", gap: "1rem", "margin-top": "1rem" }}>
                            <label>
                                Background:
                                <input
                                    type="color"
                                    value={form().base16.base00}
                                    onInput={(e) =>
                                        handleBase16Change("base00", e.currentTarget.value)
                                    }
                                />
                            </label>
                            <label>
                                Text:
                                <input
                                    type="color"
                                    value={form().base16.base05}
                                    onInput={(e) =>
                                        handleBase16Change("base05", e.currentTarget.value)
                                    }
                                />
                            </label>
                            <label>
                                Navbar:
                                <input
                                    type="color"
                                    value={form().base16.base01}
                                    onInput={(e) =>
                                        handleBase16Change("base01", e.currentTarget.value)
                                    }
                                />
                            </label>
                        </div>
                        <div style={{ "margin-top": "1rem" }}>
                            <button type="submit">{editing() ? "Save" : "Create"}</button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                style={{ "margin-left": "1rem" }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </Show>
            </div>
        </>
    )
}
