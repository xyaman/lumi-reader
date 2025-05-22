import postcss, { Root, Rule } from "postcss"

export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

export async function filterCssByClassOnly(cssText: string): Promise<string> {
    const result = await postcss([
        (root: Root) => {
            root.walkRules((rule: Rule) => {
                if (!rule.selector.includes(".")) {
                    rule.remove()
                }
            })
        },
        // @ts-ignore
    ]).process(cssText, { from: undefined })

    return result.css
}
