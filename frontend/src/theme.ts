export interface ITheme {
    name: string
    base16: {
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
}

export const defaultThemes: ITheme[] = [
    {
        name: "Minimal white",
        base16: {
            base00: "#ffffff", // background
            base01: "#f4f4f4", // lighter background / nav
            base02: "#e0e0e0", // border, cards
            base03: "#c0c0c0", // muted
            base04: "#909090", // secondary text
            base05: "#1a1a1a", // primary text
            base06: "#000000", // lighter text (inverse bg)
            base07: "#f8f8f8", // lightest (hover bg in dark theme)
            base08: "#d94f4f", // red (error)
            base09: "#e58e26", // orange (warning)
            base0A: "#cabf00", // yellow (notice)
            base0B: "#50a14f", // green (success)
            base0C: "#38b7b8", // cyan (info)
            base0D: "#4078f2", // blue (links)
            base0E: "#a626a4", // purple (accent)
            base0F: "#cc6600", // brown / override
        },
    },
    {
        name: "Minimal Dark",
        base16: {
            base00: "#1b1f23", // background
            base01: "#24292e", // lighter background / nav
            base02: "#2f363d", // border, cards
            base03: "#586069", // muted
            base04: "#6a737d", // secondary text
            base05: "#d1d5da", // primary text
            base06: "#e1e4e8", // lighter text (inverse bg)
            base07: "#f6f8fa", // lightest (hover bg in dark theme)
            base08: "#ff5c57", // red (error)
            base09: "#f6992d", // orange (warning)
            base0A: "#f2e85c", // yellow (notice)
            base0B: "#3dd68c", // green (success)
            base0C: "#56d4dd", // cyan (info)
            base0D: "#79b8ff", // blue (links)
            base0E: "#b392f0", // purple (accent)
            base0F: "#be5046", // brown / override
        },
    },
    {
        name: "Catppuccin Macchiato",
        base16: {
            base00: "#24273a", // background
            base01: "#1e2030", // nav / panels
            base02: "#363a4f", // cards / hover
            base03: "#494d64", // muted text
            base04: "#5b6078", // secondary text
            base05: "#cad3f5", // primary text
            base06: "#f4dbd6", // heading / bright
            base07: "#b7bdf8", // highlights
            base08: "#ed8796", // red (error)
            base09: "#f5a97f", // orange (warning)
            base0A: "#eed49f", // yellow (notice)
            base0B: "#a6da95", // green (success)
            base0C: "#8bd5ca", // cyan (info)
            base0D: "#8aadf4", // blue (links)
            base0E: "#c6a0f6", // purple (accent)
            base0F: "#f0c6c6", // pink / override
        },
    },
]

const CUSTOM_THEMES_KEY = "themes:custom"
const SELECTED_THEME_KEY = "themes:selected"

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

export function getAllThemes(): ITheme[] {
    return [...defaultThemes, ...getCustomThemes()]
}

export function setGlobalTheme(name: string) {
    const theme = getAllThemes().find((t) => t.name === name)
    if (!theme) return

    // Set all base16 variables
    Object.entries(theme.base16).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value)
    })
    localStorage.setItem(SELECTED_THEME_KEY, name)
}

export function getSelectedTheme(): string {
    return localStorage.getItem(SELECTED_THEME_KEY) || defaultThemes[1].name
}
