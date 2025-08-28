class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ show ]

  def show
    user = User.find_by(username: params[:username])
    if user
    end
  end
end
