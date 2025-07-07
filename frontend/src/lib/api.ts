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

export interface IRegisterBody {
    email: string
    username: string
    password: string
    password_confirmation: string
}

export interface IRegisterResponse {
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

export interface ILoginBody {
    email: string
    password: string
}

export interface ILoginResponse {
    user: {
        id: number
        email: string
        username: string
        share_status: boolean
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

async function logout(): Promise<void> {
    const url = `${API_URL}/${API_VERSION}/session`
    const cookie = await getCsrfCookie()

    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    try {
        await fetch(url, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
            },
        })
    } catch {
        throw new Error("Network error")
    }
}

export interface IProfileInfoResponse {
    user: {
        id: number
        avatar_url: string
        username: string
        description: string
        share_status: boolean
        following_count: number
        followers_count: number
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

export interface IUpdateAvatarResponse {
    avatar_url: string
}

async function updateAvatar(file: File): Promise<IUpdateAvatarResponse> {
    const url = `${API_URL}/${API_VERSION}/session/avatar`

    const cookie = await getCsrfCookie()
    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    const formData = new FormData()
    formData.append("avatar", file)

    let res: Response
    try {
        res = await fetch(url, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
            },
            body: formData,
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Create follow failed: ${res.statusText}`)
    }
    return data
}

export interface IUpdateDescriptionResponse {
    message: string
    description: string
}

async function updateDescription(description: string): Promise<IUpdateDescriptionResponse> {
    const url = `${API_URL}/${API_VERSION}/session/description`

    const cookie = await getCsrfCookie()
    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    let res: Response
    try {
        res = await fetch(url, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ description }),
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Update description failed: ${res.statusText}`)
    }
    return data
}

async function updateCurrentUserStatus(activty: string): Promise<IUpdateDescriptionResponse> {
    const url = `${API_URL}/${API_VERSION}/session/status`

    const cookie = await getCsrfCookie()
    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    let res: Response
    try {
        res = await fetch(url, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ last_activity: activty }),
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Update status failed: ${res.statusText}`)
    }
    return data
}

export interface IUpdateShareStatus {
    message: string
    description: string
}

async function updateShareStatus(status: boolean): Promise<IUpdateDescriptionResponse> {
    const url = `${API_URL}/${API_VERSION}/session/share_status`

    const cookie = await getCsrfCookie()
    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    let res: Response
    try {
        res = await fetch(url, {
            method: "PATCH",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ share_status: status }),
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Update status failed: ${res.statusText}`)
    }
    return data
}

export interface ISesssionInfoResponse {
    user: {
        id: number
        email: string
        username: string
        share_status: boolean
        avatar_url?: string
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

async function follow(userId: number): Promise<void> {
    const url = `${API_URL}/${API_VERSION}/session/follows/${userId}`

    const cookie = await getCsrfCookie()
    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    let res: Response
    try {
        res = await fetch(url, {
            method: "PUT",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
            },
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Create follow failed: ${res.statusText}`)
    }
    return data
}

async function unfollow(userId: number): Promise<void> {
    const url = `${API_URL}/${API_VERSION}/session/follows/${userId}`

    const cookie = await getCsrfCookie()
    if (!cookie) {
        throw new Error("Can't validate the connection")
    }

    let res: Response
    try {
        res = await fetch(url, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "X-CSRF-TOKEN": cookie,
            },
        })
    } catch {
        throw new Error("Network error")
    }

    const data = await res.json()
    if (!res.ok) {
        throw new Error(data?.error ? data.error : `Delete follow failed: ${res.statusText}`)
    }
    return data
}

export interface IFollowResponse {
    following: Array<{
        id: number
        username: string
    }>
}

export interface IFollowerResponse {
    followers: Array<{
        id: number
        username: string
    }>
}

/**
 * Fetches the list of users that the specified user is following.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<IFollowResponse>} The list of following users.
 * @throws {Error} If the network request fails or the response is not OK.
 */
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

/**
 * Fetches the list of followers for the specified user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<IFollowerResponse>} The list of followers.
 * @throws {Error} If the network request fails or the response is not OK.
 */
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

async function fetchUserStatus(userId: number): Promise<IFollowerResponse> {
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

export interface IUserStatusBatchResponse {
    results: Array<{
        user_id: number
        timestamp: number
        last_activity: number
    }>
}

async function fetchUserStatusBatch(userIds: number[]): Promise<IUserStatusBatchResponse> {
    const params = new URLSearchParams()
    userIds.forEach((id) => params.append("user_ids[]", id.toString()))
    const url = `${API_URL}/${API_VERSION}/user_status/batch?${params.toString()}`

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
        throw new Error(
            data?.error ? data.error : `User Status batch fetch failed: ${res.statusText}`,
        )
    }
    return data
}

interface IUsersQueryResponse {
    users: {
        id: number
        username: string
        avatar_url: string
    }[]
    pagy: {
        page: number
        items: number
        pages: number
        count: number
    }
}

async function fetchUsersByQuery(query: string): Promise<IUsersQueryResponse> {
    const url = `${API_URL}/${API_VERSION}/users/search?q=${query}`

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
        throw new Error(data?.error ? data.error : `User search fetch failed: ${res.statusText}`)
    }
    return data
}

export default {
    register,
    login,
    logout,
    updateAvatar,
    updateDescription,
    updateShareStatus,
    updateCurrentUserStatus,
    fetchProfileInfo,
    follow,
    unfollow,
    fetchUserFollows,
    fetchUserFollowers,
    fetchSessionInfo,
    fetchUserStatusBatch,
    fetchUserStatus,
    fetchUsersByQuery,
}
