import { createEffect, createSignal, For } from "solid-js"
import { ITheme } from "@/theme"
import { useThemeContext } from "@/context/theme"

type Base16Key = keyof ITheme

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

export default function ThemeEditor(props: {
    initialTheme?: ITheme
    mode?: "create" | "edit"
    onClose: () => void
}) {
    const { saveTheme } = useThemeContext()
    const [form, setForm] = createSignal<ITheme>(
        props.initialTheme ? { ...props.initialTheme } : emptyTheme,
    )
    const [yamlString, setYamlString] = createSignal(themeToYAML(form()))
    const [yamlError, setYamlError] = createSignal<string | null>(null)
    const originalName = props.initialTheme?.scheme ?? ""

    createEffect(() => setYamlString(themeToYAML(form())))

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
        saveTheme(theme, props.mode === "edit" ? originalName : undefined)
        props.onClose()
        if (props.mode === "create") setForm(emptyTheme)
    }

    return (
        <form onSubmit={handleFormSubmit} class="navbar-theme p-4 rounded-lg">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">
                    {props.mode === "edit" ? "Edit Theme" : "New Theme"}
                </h3>
                <button
                    type="button"
                    class="button cursor-pointer text-sm px-4 py-2 rounded-lg"
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
                <button type="submit" class="button px-4">
                    {props.mode === "edit" ? "Save" : "Create"}
                </button>
                <button type="button" class="button px-4" onClick={props.onClose}>
                    Cancel
                </button>
            </div>
        </form>
    )
}
