export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

export function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches
}

export function formatTime(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60

    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
}

export function parseCss(cssText: string) {
    const rules = []
    let cursor = 0
    const len = cssText.length

    while (cursor < len) {
        // find next valid char (ignore whitespaces and line jumps)
        while (cursor < len && /\s/.test(cssText[cursor])) cursor++

        // start of selector
        const selectorStart = cursor
        while (cursor < len && cssText[cursor] != "{") cursor++
        const selector = cssText.slice(selectorStart, cursor).trim()

        if (!selector) break

        // skip {
        cursor++
        let level = 1
        const blockStart = cursor
        while (cursor < len && level > 0) {
            if (cssText[cursor] === "{") {
                level++
            } else if (cssText[cursor] === "}") {
                level--
            }

            cursor++
        }

        // bg-* no avoid problems with tailwind
        if (selector[0] === "." && !selector.includes(".bg-")) {
            // ignore empty classes
            if (cssText.slice(blockStart, cursor).trim() === "}") continue
            rules.push(cssText.slice(selectorStart, cursor))
        }
    }

    return rules
}

export function timeAgo(unixTimestamp?: number): string {
    if (!unixTimestamp) return ""

    const now = Date.now()
    // seconds to miliseconds
    const inputTime = unixTimestamp * 1000
    const diffMs = now - inputTime
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 3) {
        return "Now"
    } else if (diffMins < 60) {
        return `${diffMins} mins ago`
    } else {
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
        } else {
            const diffDays = Math.floor(diffHours / 24)
            return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
        }
    }
}

// Converts camelCase keys to snake_case recursively
export function camelToSnake(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(camelToSnake)
    } else if (obj && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key.replace(/([A-Z])/g, "_$1").toLowerCase(),
                camelToSnake(value),
            ]),
        )
    }
    return obj
}

// Converts snake_case keys to camelCase recursively
export function snakeToCamel(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(snakeToCamel)
    } else if (obj && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
                snakeToCamel(value),
            ]),
        )
    }
    return obj
}
