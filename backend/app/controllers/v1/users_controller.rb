class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]
  wrap_parameters :user, include: [ :password, :password_confirmation ]

  # @oas_include
  # @tags Users
  # @no_auth
  # @summary Create a User
  # @request_body The user to be created [!Hash{user: Hash{email: String, username: String, password: String, password_confirmation: String }}]
  # @response User created successfully(201) [Hash{user: Hash{id: Integer, email: String, username: String}}]
  # @response Validation failed(422) [Hash{errors: Array<String>}]
  def create
    user = User.new(user_params)
    if user.save
      start_new_session_for user
      render json: { user: user.slice(:id, :email, :username) }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
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

  private
  def user_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end
end
