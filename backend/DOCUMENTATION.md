# Lumi Reader Backend API Documentation

This document provides an overview of the Lumi Reader Backend API, detailing available endpoints, request parameters, and response formats.

## Authentication

This API uses session-based authentication with CSRF protection.

*   **CSRF Token:** A CSRF token is set in a cookie named `CSRF-TOKEN` upon successful authentication or by calling the `/csrf` endpoint. This token must be included in the `X-CSRF-Token` header for all state-changing requests (POST, PUT, PATCH, DELETE).
*   **Session:** A session cookie is used to maintain user login status.

## Error Handling

API errors are returned in a consistent JSON format:

```json
{
  "status": "error",
  "errors": [
    "Error message 1",
    "Error message 2"
  ],
  "message": null
}
```

*   `status`: Always "error".
*   `errors`: An array of strings, each representing an error message.
*   `message`: Always null for error responses.

Common HTTP status codes for errors include:
*   `401 Unauthorized`: Authentication required or failed.
*   `422 Unprocessable Content`: Semantic errors in the request (e.g., invalid parameters, validation failures).
*   `404 Not Found`: Resource not found.

## API Endpoints

### 1. CSRF Token

*   **GET `/csrf`**
    *   **Description:** Retrieves a CSRF token.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Operation finished successfully"
        }
        ```
        (The CSRF token will be set in the `CSRF-TOKEN` cookie.)
    *   **Error Responses:** None specific.

### 2. User Registration

*   **POST `/v1/registration`**
    *   **Description:** Registers a new user.
    *   **Request Parameters:**
        ```json
        {
          "user": {
            "email": "string",
            "username": "string",
            "password": "string",
            "password_confirmation": "string"
          }
        }
        ```
    *   **Success Response (201 Created):**
        ```json
        {
          "status": "success",
          "data": {
            "id": "integer",
            "username": "string",
            "avatar_url": "string | null"
          },
          "message": "Registered successfully. Please check your email to confirm your account."
        }
        ```
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Email has already been taken"`
        *   `"Username has already been taken"`
        *   `"Password is too short (minimum is 8 characters)"`
        *   `"Password confirmation doesn't match Password"`
        *   `"Email is invalid"`

*   **GET `/v1/registration/confirm`**
    *   **Description:** Confirms a user's email address using a token sent to their email. This endpoint can either redirect to the frontend or return a JSON response based on the `api` parameter.
    *   **Request Parameters (Query):**
        *   `token`: `string` (Required) - The email confirmation token.
        *   `api`: `boolean` (Optional) - If present and true, returns JSON. Otherwise, redirects.
    *   **Success Response (200 OK - JSON, if `api=true`):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Account confirmed. You can now sign in."
        }
        ```
        or
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Account already confirmed."
        }
        ```
    *   **Success Redirect (302 Found - if `api` is not true):**
        *   Redirects to `FRONTEND_URL/login?status=confirmed`
        *   Redirects to `FRONTEND_URL/login?status=already_confirmed`
    *   **Error Responses (422 Unprocessable Content - JSON, if `api=true`):**
        ```json
        {
          "status": "error",
          "errors": [
            "Invalid or expired confirmation token."
          ],
          "message": null
        }
        ```
    *   **Error Redirect (302 Found - if `api` is not true):**
        *   Redirects to `FRONTEND_URL/login?status=invalid_token`

### 3. User Sessions

*   **POST `/v1/session`**
    *   **Description:** Logs in a user and creates a new session.
    *   **Request Parameters:**
        ```json
        {
          "credentials": {
            "email": "string",
            "password": "string"
          }
        }
        ```
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "id": "integer",
            "username": "string",
            "avatar_url": "string | null",
            "bio": "string | null",
            "share_online_status": "boolean",
            "share_presence": "boolean",
            "following_count": "integer",
            "followers_count": "integer",
            "tier": {
              "name": "string",
              "book_sync_limit": "integer"
            },
            "email": "string",
            "is_patreon_linked": "boolean"
          },
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (401 Unauthorized):**
        *   `"Invalid email or password."`
        *   `"Please confirm your email before logging in."`

*   **GET `/v1/session`**
    *   **Description:** Retrieves information about the currently logged-in user.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):** Same as `POST /v1/session` success response.
    *   **Error Responses (401 Unauthorized):** If no user is logged in.

*   **DELETE `/v1/session`**
    *   **Description:** Logs out the current user and terminates the session.
    *   **Request Parameters:** None
    *   **Success Response (204 No Content):** No content is returned.
    *   **Error Responses:** None specific.

### 4. Password Resets

*   **POST `/v1/password_resets`**
    *   **Description:** Initiates a password reset process by sending a reset email to the provided email address.
    *   **Request Parameters:**
        ```json
        {
          "email": "string"
        }
        ```
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Operation finished successfully"
        }
        ```
        (Always returns success, even if the email doesn't exist, to prevent email enumeration.)
    *   **Error Responses:** None specific.

*   **GET `/v1/password_resets/:token/edit`**
    *   **Description:** Redirects the user to the frontend password reset page with the provided token.
    *   **Request Parameters (Path):**
        *   `token`: `string` (Required) - The password reset token.
    *   **Success Redirect (302 Found):**
        *   Redirects to `FRONTEND_URL/editpassword?token=:token`
    *   **Error Redirect (302 Found):**
        *   Redirects to `FRONTEND_URL/editpassword?token=expired` (if the token is invalid or expired)

*   **PATCH/PUT `/v1/password_resets/:token`**
    *   **Description:** Resets the user's password using a valid token.
    *   **Request Parameters (Path):**
        *   `token`: `string` (Required) - The password reset token.
    *   **Request Body:**
        ```json
        {
          "password_reset": {
            "password": "string",
            "password_confirmation": "string"
          }
        }
        ```
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Your password reset link has expired. Please try again."`
        *   Validation errors for `password` (e.g., `"Password is too short (minimum is 8 characters)"`, `"Password confirmation doesn't match Password"`).

### 5. User Management (Me)

*   **GET `/v1/me`**
    *   **Description:** Retrieves the profile information of the currently authenticated user.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "id": "integer",
            "username": "string",
            "avatar_url": "string | null",
            "bio": "string | null",
            "share_online_status": "boolean",
            "share_presence": "boolean",
            "following_count": "integer",
            "followers_count": "integer",
            "tier": {
              "name": "string",
              "book_sync_limit": "integer"
            }
          },
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (401 Unauthorized):** If no user is logged in.

*   **PATCH/PUT `/v1/me`**
    *   **Description:** Updates the profile information of the currently authenticated user.
    *   **Request Parameters:**
        ```json
        {
          "user": {
            "bio": "string | null",
            "share_online_status": "boolean",
            "share_presence": "boolean"
          }
        }
        ```
    *   **Success Response (200 OK):** Same as `GET /v1/me` success response.
    *   **Error Responses (422 Unprocessable Content):**
        *   Validation errors for `bio`, `share_online_status`, `share_presence`.
        *   `"User not found."` (if authentication fails)

*   **POST `/v1/me/avatar`**
    *   **Description:** Uploads or updates the avatar for the currently authenticated user.
    *   **Request Parameters (Multipart Form Data):**
        *   `avatar`: `file` (Required) - The image file for the avatar (max 2MB).
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "avatar_url": "string"
          },
          "message": "Avatar updated successfully."
        }
        ```
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Missing avatar file."`
        *   `"Avatar is too big (max 2MB)."`
        *   `"Avatar upload failed"`
        *   `"User not found."` (if authentication fails)

### 6. Public User Profiles

*   **GET `/v1/users/:username`**
    *   **Description:** Retrieves the public profile information for a specific user by username.
    *   **Request Parameters (Path):**
        *   `username`: `string` (Required) - The username of the target user.
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "id": "integer",
            "username": "string",
            "avatar_url": "string | null",
            "bio": "string | null",
            "share_online_status": "boolean",
            "share_presence": "boolean",
            "following_count": "integer",
            "followers_count": "integer",
            "tier": {
              "name": "string",
              "book_sync_limit": "integer"
            }
          },
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (404 Not Found):**
        *   `"User not found."`

*   **GET `/v1/users/:username/following`**
    *   **Description:** Retrieves a list of users that the specified user is following.
    *   **Request Parameters (Path):**
        *   `username`: `string` (Required) - The username of the target user.
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": [
            {
              "id": "integer",
              "username": "string",
              "avatar_url": "string | null"
            }
            // ... more user objects
          ],
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (404 Not Found):**
        *   `"User not found."`

*   **GET `/v1/users/:username/followers`**
    *   **Description:** Retrieves a list of users who are following the specified user.
    *   **Request Parameters (Path):**
        *   `username`: `string` (Required) - The username of the target user.
    *   **Success Response (200 OK):** Same as `GET /v1/users/:username/following` success response.
    *   **Error Responses (404 Not Found):**
        *   `"User not found."`

*   **PUT `/v1/users/:username/follow`**
    *   **Description:** Allows the authenticated user to follow another user.
    *   **Request Parameters (Path):**
        *   `username`: `string` (Required) - The username of the user to follow.
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (404 Not Found):**
        *   `"User not found."`
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Follower can't follow yourself"` (if attempting to follow self)
        *   `"Follower has already been taken"` (if already following the user)

*   **PUT `/v1/users/:username/unfollow`**
    *   **Description:** Allows the authenticated user to unfollow another user.
    *   **Request Parameters (Path):**
        *   `username`: `string` (Required) - The username of the user to unfollow.
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (404 Not Found):**
        *   `"User not found."`
    *   **Error Responses (422 Unprocessable Content):**
        *   `"You are not following this user."`

### 7. Patreon Integration

*   **GET `/v1/auth/patreon/generate`**
    *   **Description:** Generates a Patreon authorization URL for linking a Patreon account.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": "string (Patreon authorization URL)",
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Patreon API error: ..."`

*   **GET `/v1/auth/patreon/callback`**
    *   **Description:** Callback endpoint for Patreon OAuth. Exchanges the authorization code for tokens and links the Patreon account to the current user. This endpoint redirects to the frontend.
    *   **Request Parameters (Query):**
        *   `code`: `string` (Required) - The authorization code from Patreon.
        *   `state`: `string` (Required) - The session ID used to identify the user.
    *   **Success Redirect (302 Found):**
        *   Redirects to `FRONTEND_URL/settings/account?patreon_status=success`
    *   **Error Redirect (302 Found):**
        *   Redirects to `FRONTEND_URL/settings/account?patreon_status=error`

*   **GET `/v1/auth/patreon/refresh`**
    *   **Description:** Refreshes the Patreon access token and updates user's Patreon information.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Patreon API error: ..."`

*   **GET `/v1/auth/patreon/unlink`**
    *   **Description:** Unlinks the Patreon account from the current user.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": null,
          "message": "Unlinked successfully!"
        }
        ```
    *   **Error Responses:** None specific.

### 8. Patreon Tiers

*   **GET `/v1/patreon_tiers`**
    *   **Description:** Retrieves a list of all available Patreon tiers.
    *   **Request Parameters:** None
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": [
            {
              "id": "integer",
              "patreon_tier_id": "string",
              "name": "string",
              "description": "string",
              "amount_cents": "integer",
              "published": "boolean",
              "image_url": "string | null",
              "book_sync_limit": "integer"
            }
            // ... more tier objects
          ],
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses:** None specific.

*   **GET `/v1/patreon_tiers/:id`**
    *   **Description:** Retrieves details for a specific Patreon tier by its `patreon_tier_id`.
    *   **Request Parameters (Path):**
        *   `id`: `string` (Required) - The `patreon_tier_id` of the target tier.
    *   **Success Response (200 OK):**
        ```json
        {
          "status": "success",
          "data": {
            "id": "integer",
            "patreon_tier_id": "string",
            "name": "string",
            "description": "string",
            "amount_cents": "integer",
            "published": "boolean",
            "image_url": "string | null",
            "book_sync_limit": "integer"
          },
          "message": "Operation finished successfully"
        }
        ```
    *   **Error Responses (422 Unprocessable Content):**
        *   `"Patreon tier not found."`

### 9. Webhooks

*   **POST `/v1/webhooks/patreon`**
    *   **Description:** Endpoint for Patreon webhooks to receive events (e.g., membership changes).
    *   **Request Parameters (Body):** Raw JSON payload from Patreon.
    *   **Request Headers:**
        *   `X-Patreon-Event`: `string` (e.g., "members:pledge:create", "members:pledge:update", "members:pledge:delete")
    *   **Success Response (200 OK):** `head :ok` (no content)
    *   **Error Responses (400 Bad Request):**
        *   `"Invalid payload"` (if the request body is not valid JSON)