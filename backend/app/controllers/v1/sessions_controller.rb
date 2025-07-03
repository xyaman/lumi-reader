class V1::SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]
  rate_limit to: 10, within: 3.minutes, only: :create

  def create
    user = User.authenticate_by(params.permit(:email, :password))
    if user
      start_new_session_for user
      render json: { status: "logged in" }, status: :ok
    else
      render json: { error: "Invalid id or password" }, status: :unauthorized
    end
  end

  def show
    if Current.session&.user
      user = Current.session.user
      render json: { user: user.slice(:id, :email, :username) }, status: :ok
    else
      render json: { user: nil, error: "Not logged in" }, status: :unauthorized
    end
  end

  def destroy
    terminate_session
    head :no_content
  end
end
