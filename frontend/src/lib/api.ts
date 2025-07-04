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

interface IRegisterResponse {
    user: {
        id: number
        email: string
        username: string
    }
}

/**
 * Registers a new user with the provided credentials.
 * @param {IRegisterBody} body - The registration details.
 * @returns {Promise<void>}
 * @throws {Error} If the network request fails or the response cannot be parsed as JSON.
 */
async function register(body: IRegisterBody): Promise<IRegisterResponse> {
    const url = `${API_URL}/${API_VERSION}/users`
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
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(
            data?.errors ? data.errors.join(", ") : `Registration failed: ${res.statusText}`,
        )
    }
    return data
}

interface ILoginBody {
    email: string
    password: string
}

interface ILoginResponse {
    user: {
        id: number
        email: string
        username: string
        share_reading_data: boolean
    }
}

async function login(body: ILoginBody): Promise<ILoginResponse> {
    const url = `${API_URL}/${API_VERSION}/session`
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
            body: JSON.stringify(body),
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.errors ? data.errors.join(", ") : `Login failed: ${res.statusText}`)
    }
    return data
}

interface IProfileInfoResponse {
    user: {
        id: number
        username: string
        share_reading_data: boolean
    }
}

/**
 * Fetches the current authenticated user's profile information.
 * @returns {Promise<any>} The user's profile data.
 * @throws {Error} If the network request fails or the response is not OK.
 */
async function fetchProfileInfo(userId: number): Promise<IProfileInfoResponse> {
    const url = `${API_URL}/${API_VERSION}/users/${userId}`

    let res: Response
    try {
        res = await fetch(url, {
            method: "GET",
            credentials: "include",
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Profile fetched failed: ${res.statusText}`)
    }
    return data
}

interface ISesssionInfoResponse {
    user: {
        id: number
        email: string
        username: string
        share_reading_data: boolean
    }
}

/**
 * Fetches the current session information for the authenticated user.
 * @returns {Promise<ISesssionInfoResponse | null>} The session info if authenticated, or null if not logged in (401/403).
 * @throws {Error} If the network request fails or the response is not OK (except 401/403).
 */
async function fetchSessionInfo(): Promise<ISesssionInfoResponse | null> {
    const url = `${API_URL}/${API_VERSION}/session`

    let res: Response
    try {
        res = await fetch(url, {
            method: "GET",
            credentials: "include",
        })
    } catch {
        throw new Error("Network error")
    }

    if (res.status === 401 || res.status === 403) {
        return null
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Fetch session failed: ${res.statusText}`)
    }
    return data
}

interface IFollowResponse {
    following: Array<{
        id: number
        username: string
    }>
}

interface IFollowerResponse {
    followers: Array<{
        id: number
        username: string
    }>
}

async function fetchUserFollows(userId: number): Promise<IFollowResponse> {
    const url = `${API_URL}/${API_VERSION}/users/${userId}/following/`

    let res: Response
    try {
        res = await fetch(url, {
            method: "GET",
            credentials: "include",
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `User follows fetch failed: ${res.statusText}`)
    }
    console.log(data)
    return data
}

async function fetchUserFollowers(userId: number): Promise<IFollowerResponse> {
    const url = `${API_URL}/${API_VERSION}/users/${userId}/followers/`

    let res: Response
    try {
        res = await fetch(url, {
            method: "GET",
            credentials: "include",
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `User followers fetch failed: ${res.statusText}`)
    }
    return data
}

export default {
    register,
    login,
    fetchProfileInfo,
    fetchUserFollows,
    fetchUserFollowers,
    fetchSessionInfo,
}
