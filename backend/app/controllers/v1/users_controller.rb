class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ create confirm ]
  wrap_parameters :user, include: [ :password, :password_confirmation ]

  # @oas_include
  # @tags Users
  # @no_auth
  # @summary Create a User
  # @request_body The user to be created [!Hash{user: Hash{email: String, username: String, password: String, password_confirmation: String }}]
  # @response User created successfully(201) [Hash{user: Hash{id: Integer, email: String, username: String}}]
  # @response Validation failed(422) [Hash{errors: Array<String>}]
  def create
    @user = User.new(user_params)
    if @user.save
      UserMailer.confirmation_email(@user).deliver_later
      render json: { message: "Please check your email to confirm your account." }, status: :created
    else
      render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # @oas_include
  # @tags Users
  # @summary Show a User
  # @response User found(200) [Hash{user: Hash{id: Integer, email: String, username: String, share_reading_data: Boolean, following_count: Integer, followers_count: Integer}}]
  # @response User not found(404) [Hash{error: String}]
  #
  # Returns the user with the given ID.
  def show
    user = User.find_by(id: params[:id])
    if user

      following_count = user.following.count
      followers_count = user.followers.count

      json_user = user.slice(:id, :email, :username, :share_reading_data)
      json_user.merge!(following_count: following_count, followers_count: followers_count)

      render json: { user: json_user }, status: :ok
    else
      render json: { error: "User not found" }, status: :not_found
    end
  end

  # @oas_include
  # @tags Users
  # @summary Confirm a User
  # @parameter token(query) [!String] required The confirmation token
  # @parameter api(query) [Boolean] optional Return JSON instead of redirect
  # @response Account confirmed(200) [Hash{message: String}]
  # @response Invalid or expired confirmation token(404) [Hash{error: String}]
  def confirm
    user = User.find_by(confirmation_token: params[:token])
    puts params
    base_url = ENV["FRONTEND_URL"].presence || "http://localhost:5173"
    login_url = "#{base_url}/login"

    # If `params[:api]` is present, return JSON
    # If not, redirect to the login page with the appropriate status.
    if params[:api].present?
      if user&.confirmed?
        render json: { message: "Account already confirmed." }, status: :ok
      elsif user
        user.confirm!
        render json: { message: "Account confirmed. You can now sign in." }, status: :ok
      else
        render json: { error: "Invalid or expired confirmation token." }, status: :not_found
      end
    else
      if user&.confirmed?
        redirect_to "#{login_url}?status=already_confirmed"
      elsif user
        user.confirm!
        redirect_to "#{login_url}?status=confirmed"
      else
        redirect_to "#{login_url}?status=invalid_token"
      end
    end
  end

  private
  def user_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end
end
