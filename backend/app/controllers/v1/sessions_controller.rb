class V1::SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]
  rate_limit to: 10, within: 3.minutes, only: :create

  # @oas_include
  # @tags Session
  # @summary Log in a User (create session)
  # @no_auth
  # @request_body User credentials [Hash{email: String, password: String}]
  # @response Logged in successfully(200) [Hash{user: Hash{id: String, email: String, username: String, share_reading_data: Boolean}}]
  # @response Invalid credentials(401) [Hash{error: String}]
  def create
    user = User.authenticate_by(params.permit(:email, :password))
    if user
      if user.confirmed?
        start_new_session_for user
        render json: { user: user.slice(:id, :email, :username, :share_reading_data) }, status: :ok
      else
        render json: { error: "Please confirm your email before logging in." }, status: :unauthorized
      end
    else
      render json: { error: "Invalid id or password" }, status: :unauthorized
    end
  end

  # @oas_include
  # @tags Session
  # @summary Get current logged-in User
  # @response User info(200) [Hash{user: Hash{id: Integer, email: String, username: String, share_reading_data: Boolean}}]
  # @response Not logged in(401) [Hash{user: nil, error: String}]
  def show
    if Current.session&.user
      user = Current.session.user
      render json: { user: user.slice(:id, :email, :username, :share_reading_data) }, status: :ok
    else
      # this shouldn't happen. `allow_unauthenticated_access` should block
      render json: { user: nil, error: "Not logged in" }, status: :unauthorized
    end
  end

  # @oas_include
  # @tags Session
  # @summary Log out current User (destroy session)
  # @response No content(204) []
  def destroy
    terminate_session
    head :no_content
  end
end
