class V1::SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]
  rate_limit to: 10, within: 3.minutes, only: :create

  # @oas_include
  # @tags Session
  # @summary Log in a User (create session)
  # @no_auth
  # @request_body User credentials [Hash{email: String, password: String}]
  # @response Logged in successfully(200) [Hash{user: Hash{id: String, email: String, username: String, share_status: Boolean}}]
  # @response Invalid credentials(401) [Hash{error: String}]
  def create
    user = User.authenticate_by(params.permit(:email, :password))

    unless user
      return unauthorized_response("Invalid email or password")
    end

    unless user.confirmed?
      return unauthorized_response("Please confirm your email before logging in.")
    end

    start_new_session_for user
    serialized_user = UserSerializer.basic(user).merge(share_status: user.share_status)
    success_response({ user: serialized_user })
  end

  # @oas_include
  # @tags Session
  # @summary Get current logged-in User
  # @response User info(200) [Hash{user: Hash{id: Integer, email: String, username: String, share_status: Boolean}}]
  # @response Not logged in(401) [Hash{user: nil, error: String}]
  def show
    unless Current.session&.user
      return render json: { user: nil, error: "Not logged in" }, status: :unauthorized
    end

    user = Current.session.user
    serialized_user = UserSerializer.basic(user).merge(share_status: user.share_status)
    success_response({ user: serialized_user })
  end

  # @oas_include
  # @tags Session
  # @summary Log out current User (destroy session)
  # @response No content(204) []
  def destroy
    terminate_session
    no_content_response
  end
end
