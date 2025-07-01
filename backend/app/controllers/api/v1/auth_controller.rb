class Api::V1::AuthController < ApplicationController
  before_action :authorize_request, only: [ :logout ]

  # POST /register
  # Registers a new user and returns a JWT in a secure cookie
  def register
    user = User.new(user_params)
    if user.save
      token = encode_token(user_id: user.id)
      set_jwt_cookie(token)
      render json: { user: user.slice(:id, :email, :username) }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # POST /login
  # Authenticates user and returns a JWT in a secure cookie
  def login
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      token = encode_token(user_id: user.id)
      set_jwt_cookie(token)
      render json: { user: user.slice(:id, :email, :username) }, status: :ok
    else
      render json: { error: "Invalid id or password" }, status: :unauthorized
    end
  end

  # DELETE /logout
  def logout
    cookies.delete(:jwt)
    head :no_content
  end

  # GET /search
  def search
    return render json: { error: "Missing username param" } unless params[:username].present?

    users = User.find_by_username(params[:username])
    render json: users.select(:id, :username)
  end


  private
  # Strong parameters for user registration
  def user_params
    params.permit(:email, :username, :password, :password_confirmation)
  end
end
