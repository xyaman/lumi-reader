class V1::SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ create ]

  def create
    user = User.authenticate_by(login_params)
    unless user
      return render_error errors: "Invalid email or password.", status: :unauthorized
    end

    unless user.email_confirmed?
      return render_error errors: "Please confirm your email before logging in.", status: :unauthorized
    end

    start_new_session_for user
    render_success data: UserBlueprint.render_as_json(user, view: :login), status: :created
  end

  def show
    user = Current.user
    render_success data: UserBlueprint.render_as_json(user, view: :login)
  end

  def destroy
    terminate_session
    head :no_content
  end

  private
  def login_params
    params.require(:credentials).permit(:email, :password)
  end
end
