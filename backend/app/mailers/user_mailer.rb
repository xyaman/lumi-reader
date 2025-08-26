class UserMailer < ApplicationMailer
  include Rails.application.routes.url_helpers

  def password_reset_v1(user)
    @user = user
    @token = @user.password_reset_token
    @password_reset_url = edit_v1_password_reset_url(@user.password_reset_token)
    mail(to: @user.email, subject: "Confirm your account")
  end

  def confirmation_email_v1(user)
    @user = user
    @token = @user.email_confirmation_token
    mail(to: @user.email, subject: "Confirm your account")
  end
end
