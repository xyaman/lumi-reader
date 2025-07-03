class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]
  wrap_parameters :user, include: [ :password, :password_confirmation ]

  # @oas_include
  # @tags User
  # @summary Create a User
  # @no_auth
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

  private
  def user_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end
end
