class V1::RegistrationsController < ApplicationController
  allow_unauthenticated_access

  def create
    @user = User.new(sign_up_params)

    if @user.save
      UserMailer.confirmation_email_v1(@user).deliver_later
      render_success data: @user, message: "Registered successfully. Please check your email to confirm your account.", status: :created
    else
      render_error errors: @user.errors.full_messages
    end
  end

  def confirm
    user = User.find_by_email_confirmation_token(params[:token])
    base_url = ENV["FRONTEND_URL"].presence || "http://localhost:5173"
    login_url = "#{base_url}/login"

    if params[:api].present?
      handle_api_confirmation(user)
    else
      handle_redirect_confirmation(user, login_url)
    end
  end

  private

  def sign_up_params
    params.expect(user: %i[email username password password_confirmation])
  end

  def handle_api_confirmation(user)
    if user&.email_confirmed?
      render_success message: "Account already confirmed."
    elsif user
      user.confirm_email!
      render_success message: "Account confirmed. You can now sign in."
    else
      render_error errors: "Invalid or expired confirmation token."
    end
  end

  def handle_redirect_confirmation(user, login_url)
    if user&.email_confirmed?
      redirect_to "#{login_url}?status=already_confirmed", allow_other_host: true
    elsif user
      user.confirm_email!
      redirect_to "#{login_url}?status=confirmed", allow_other_host: true
    else
      redirect_to "#{login_url}?status=invalid_token", allow_other_host: true
    end
  end
end
