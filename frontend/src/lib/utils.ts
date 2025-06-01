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
            console.log(selector)
            // ignore empty classes
            if (cssText.slice(blockStart, cursor).trim() === "}") continue
            rules.push(cssText.slice(selectorStart, cursor))
        }
    }

    return rules
}
