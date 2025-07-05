export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
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

export function timeAgo(unixTimestamp: number | null): string {
    if (!unixTimestamp) return ""

    const now = Date.now()
    // seconds to miliseconds
    const inputTime = unixTimestamp * 1000
    const diffMs = now - inputTime
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
        return `${diffMins} mins ago`
    } else {
        const diffHours = Math.floor(diffMins / 60)
        return `Last ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    }
}
