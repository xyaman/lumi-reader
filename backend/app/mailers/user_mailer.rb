class UserMailer < ApplicationMailer
  include Rails.application.routes.url_helpers

  def password_reset_v1(user)
    @user = user
    token = @user.password_reset_token
    @password_reset_url = edit_v1_password_reset_url(token)
    mail(to: @user.email, subject: "Reset your password")
  end

  def confirmation_email_v1(user)
    @user = user
    token = @user.email_confirmation_token
    @confirmation_url = confirm_v1_registration_url(token)
    mail(to: @user.email, subject: "Confirm your account")
  end
end
