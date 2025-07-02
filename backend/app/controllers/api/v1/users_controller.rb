class Api::V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]
  skip_forgery_protection only: [ :create ]

  def create
    user = User.new(params.permit(:email, :username, :password, :password_confirmation))
    if user.save
      start_new_session_for user
      render json: { user: user.slice(:id, :email, :username) }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
