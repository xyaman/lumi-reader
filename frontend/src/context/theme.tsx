// src/context/ThemeContext.tsx
import { createContext, createSignal, JSX, useContext } from "solid-js"
import {
    ITheme,
    defaultThemes,
    getCustomThemes,
    saveCustomThemes,
    getSelectedTheme,
    setGlobalTheme,
} from "../theme"

type ThemeContextType = {
    customThemes: () => ITheme[]
    selectedTheme: () => string
    allThemes: () => ITheme[]
    saveTheme: (theme: ITheme, oldName?: string) => void
    deleteTheme: (scheme: string) => void
    selectTheme: (scheme: string) => void
    duplicateTheme: (theme: ITheme) => void
}

const ThemeContext = createContext<ThemeContextType>()

export function ThemeProvider(props: { children: JSX.Element }) {
    const [customThemes, setCustomThemes] = createSignal<ITheme[]>(getCustomThemes())
    const [selectedTheme, setSelectedTheme] = createSignal<string>(getSelectedTheme())

    const allThemes = () => [...defaultThemes, ...customThemes()]

    function saveTheme(theme: ITheme, oldName?: string) {
        let updated = getCustomThemes()
        if (oldName) {
            updated = updated.map((t) => (t.scheme === oldName ? theme : t))
        } else {
            updated = [...updated, theme]
        }
        saveCustomThemes(updated)
        setCustomThemes(updated)
    }

    function deleteTheme(scheme: string) {
        const updated = customThemes().filter((t) => t.scheme !== scheme)
        saveCustomThemes(updated)
        setCustomThemes(updated)
        if (scheme === selectedTheme()) {
            selectTheme(defaultThemes[1].scheme)
        }
    }

    function selectTheme(scheme: string) {
        setGlobalTheme(scheme)
        setSelectedTheme(scheme)
    }

    function duplicateTheme(theme: ITheme) {
        const existing = getCustomThemes()
        let name = `${theme.scheme} (copy)`
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

    return (
        <ThemeContext.Provider
            value={{
                customThemes,
                selectedTheme,
                allThemes,
                saveTheme,
                deleteTheme,
                selectTheme,
                duplicateTheme,
            }}
        >
            {props.children}
        </ThemeContext.Provider>
    )
}

export function useThemeContext() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error("useThemeContext must be used inside <ThemeProvider>")
    return ctx
}
