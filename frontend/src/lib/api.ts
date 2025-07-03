const API_URL = import.meta.env.PROD ? "https://api.lumireader.app" : "http://localhost:3000"
const API_VERSION = "v1"

/**
 * Retrieves the value of a cookie by name.
 * @param {string} name - The name of the cookie.
 * @returns {string | null} The cookie value, or null if not found.
 */
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()!.split(";").shift()!
    return null
}

/**
 * Retrieves the CSRF token from cookies or fetches it from the server if not present.
 * @returns {Promise<string|null>} The CSRF token.
 * @throws {Error} If fetching the CSRF token fails due to network issues.
 */
async function getCsrfCookie(): Promise<string | null> {
    const csrfToken = getCookie("CSRF-TOKEN")
    if (csrfToken) return csrfToken

    const url = `${API_URL}/csrf`
    try {
        await fetch(url, { credentials: "include" })
    } catch {
        return null
    }

    return getCookie("CSRF-TOKEN")
}

interface IRegisterBody {
    email: string
    username: string
    password: string
    password_confirmation: string
}

/**
 * Registers a new user with the provided credentials.
 * @param {IRegisterBody} body - The registration details.
 * @returns {Promise<void>}
 * @throws {Error} If the network request fails or the response cannot be parsed as JSON.
 */
async function register(body: IRegisterBody): Promise<any> {
    const url = `${API_URL}/${API_VERSION}/user`
    const cookie = await getCsrfCookie()

    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    let res: Response
    try {
        res = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-TOKEN": cookie,
            },
            body: JSON.stringify({ user: body }),
        })
    } catch {
        throw new Error("Network error during registration")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(
            data?.errors ? data.errors.join(", ") : `Registration failed: ${res.statusText}`,
        )
    }
    return data
}

export default {
    register,
}
