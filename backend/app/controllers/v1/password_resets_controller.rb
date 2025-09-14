# https://api.rubyonrails.org/classes/ActiveModel/SecurePassword/ClassMethods.html
class V1::PasswordResetsController < ApplicationController
  allow_unauthenticated_access

  def create
    @user = User.find_by(email: params[:email])
    if @user.present?
      UserMailer.password_reset_v1(@user).deliver_later
    end

    render_success
  end

  def edit
    @user = User.find_by_password_reset_token(params[:token])
    base_url = ENV["FRONTEND_URL"].presence || "http://localhost:5173"
    login_url = "#{base_url}/reset-password"

    if @user
      redirect_to "#{login_url}?token=#{params[:token]}", allow_other_host: true
    else
      redirect_to "#{login_url}?token=expired", allow_other_host: true
    end
  end

  def update
    @user = User.find_by_password_reset_token(params[:token]) # returns user
    return render_error errors: "Your password reset link has expired. Please try again." unless @user

    if @user.update!(password_reset_params)
      render_success
    else
      render_error errors: @user.errors
    end
  end

  private

  def password_reset_params
    params.expect(password_reset: %i[password password_confirmation])
  end
end
