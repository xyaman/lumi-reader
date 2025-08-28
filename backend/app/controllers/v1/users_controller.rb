class V1::UsersController < ApplicationController
  allow_unauthenticated_access only: %i[ show ]

  def show
    user = User.find_by(username: params[:username])
    return render_error errors: "User not found." unless user

    render_success data: UserBlueprint.render_as_json(user, view: :show)
  end

  def following
  end

  def followers
  end
end
