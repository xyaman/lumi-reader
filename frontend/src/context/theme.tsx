import { createContext, JSX, useContext } from "solid-js"
import { ITheme, defaultThemes, getCustomThemes, saveCustomThemes, getSelectedTheme, setGlobalTheme } from "@/lib/theme"
import { createStore } from "solid-js/store"

type ThemeState = {
    customThemes: ITheme[]
    selectedTheme: string
    allThemes: ITheme[]
}

type ThemeDispatch = {
    saveTheme: (theme: ITheme, oldName?: string) => void
    deleteTheme: (scheme: string) => void
    selectTheme: (scheme: string) => void
    duplicateTheme: (theme: ITheme) => void
}

const ThemeStateContext = createContext<ThemeState>()
const ThemeDispatchContext = createContext<ThemeDispatch>()

export function ThemeProvider(props: { children: JSX.Element }) {
    const [store, setStore] = createStore({
        allThemes: [...defaultThemes, ...getCustomThemes()],
        selectedTheme: getSelectedTheme(),
        customThemes: getCustomThemes(),
    })

    const selectTheme = (scheme: string) => {
        setGlobalTheme(scheme)
        setStore("selectedTheme", scheme)
    }

    function updateThemes(updatedCustom: ITheme[]) {
        setStore("customThemes", updatedCustom)
        setStore("allThemes", [...defaultThemes, ...updatedCustom])
    }

    function saveTheme(theme: ITheme, oldName?: string) {
        let updated = getCustomThemes()
        if (oldName) {
            updated = updated.map((t) => (t.scheme === oldName ? theme : t))
        } else {
            updated = [...updated, theme]
        }
        saveCustomThemes(updated)
        updateThemes(updated)
    }

    const deleteTheme = (scheme: string) => {
        const updated = store.customThemes.filter((t) => t.scheme !== scheme)
        saveCustomThemes(updated)
        updateThemes(updated)
        if (scheme === store.selectedTheme) {
            selectTheme(defaultThemes[1].scheme)
        }
    }

    const duplicateTheme = (theme: ITheme) => {
        const existing = getCustomThemes()
        let name = `${theme.scheme} (copy)`
        const author = "unknown"
        let count = 2
        while (existing.some((t) => t.scheme === name)) {
            name = `${theme.scheme} (copy ${count})`
            count++
        }
        const newTheme = { ...theme, scheme: name, author: author }
        const updated = [...existing, newTheme]
        saveCustomThemes(updated)
        updateThemes(updated)
    }

    return (
        <ThemeStateContext.Provider value={store}>
            <ThemeDispatchContext.Provider value={{ selectTheme, saveTheme, duplicateTheme, deleteTheme }}>
                {props.children}
            </ThemeDispatchContext.Provider>
        </ThemeStateContext.Provider>
    )
}

export function useThemeState() {
    const ctx = useContext(ThemeStateContext)
    if (!ctx) throw new Error("useThemeState must be used inside <ThemeProvider>")
    return ctx
}

export function useThemeDispatch() {
    const ctx = useContext(ThemeDispatchContext)
    if (!ctx) throw new Error("useThemeDispatch must be used inside <ThemeProvider>")
    return ctx
}
