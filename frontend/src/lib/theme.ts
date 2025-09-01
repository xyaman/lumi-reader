export interface ITheme {
    scheme: string
    author: string
    base00: string // background
    base01: string // lighter background / nav
    base02: string // border, cards
    base03: string // muted
    base04: string // secondary text
    base05: string // primary text
    base06: string // lighter text (inverse bg)
    base07: string // lightest (hover bg in dark theme)
    base08: string // red (error)
    base09: string // orange (warning)
    base0A: string // yellow (notice)
    base0B: string // green (success)
    base0C: string // cyan (info)
    base0D: string // blue (links)
    base0E: string // purple (accent)
    base0F: string // brown / override
}

export const defaultThemes: ITheme[] = [
    {
        scheme: "Minimal White",
        author: "lumireader",
        base00: "#ffffff",
        base01: "#f4f4f4",
        base02: "#e0e0e0",
        base03: "#c0c0c0",
        base04: "#909090",
        base05: "#1a1a1a",
        base06: "#000000",
        base07: "#f8f8f8",
        base08: "#d94f4f",
        base09: "#e58e26",
        base0A: "#cabf00",
        base0B: "#50a14f",
        base0C: "#38b7b8",
        base0D: "#4078f2",
        base0E: "#a626a4",
        base0F: "#cc6600",
    },
    {
        scheme: "Minimal Dark",
        author: "lumireader",
        base00: "#1b1f23",
        base01: "#24292e",
        base02: "#2f363d",
        base03: "#586069",
        base04: "#6a737d",
        base05: "#d1d5da",
        base06: "#e1e4e8",
        base07: "#f6f8fa",
        base08: "#ff5c57",
        base09: "#f6992d",
        base0A: "#f2e85c",
        base0B: "#3dd68c",
        base0C: "#56d4dd",
        base0D: "#79b8ff",
        base0E: "#b392f0",
        base0F: "#be5046",
    },
    {
        scheme: "Catppuccin Macchiato",
        author: "lumireader",
        base00: "#24273a",
        base01: "#1e2030",
        base02: "#363a4f",
        base03: "#494d64",
        base04: "#5b6078",
        base05: "#cad3f5",
        base06: "#f4dbd6",
        base07: "#b7bdf8",
        base08: "#ed8796",
        base09: "#f5a97f",
        base0A: "#eed49f",
        base0B: "#a6da95",
        base0C: "#8bd5ca",
        base0D: "#8aadf4",
        base0E: "#c6a0f6",
        base0F: "#f0c6c6",
    },
]

const CUSTOM_THEMES_KEY = "themes:custom"
const SELECTED_THEME_KEY = "themes:selected"

export function getAllThemes(): ITheme[] {
    return [...defaultThemes, ...getCustomThemes()]
}

export function setGlobalTheme(name: string) {
    const theme = getAllThemes().find((t) => t.scheme === name)
    if (!theme) return

    // Set all base16 variables
    Object.entries(theme).forEach(([key, value]) => {
        if (!key.includes("base")) return
        document.documentElement.style.setProperty(`--${key}`, value)
    })
    localStorage.setItem(SELECTED_THEME_KEY, name)
}

export function getSelectedTheme(): string {
    return localStorage.getItem(SELECTED_THEME_KEY) || defaultThemes[1].scheme
}

// Custom themes

export function getCustomThemes(): ITheme[] {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) ?? "[]")
    } catch {
        return []
    }
}

export function saveCustomThemes(themes: ITheme[]) {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
}
