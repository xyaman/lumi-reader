class UserMailer < ApplicationMailer
  # https://guides.rubyonrails.org/routing.html#creating-paths-and-urls-from-objects
  include Rails.application.routes.url_helpers

  def confirmation_email(user)
    @user = user
    @user.generate_confirmation_token

    @confirmation_url = v1_users_confirm_url(token: @user.confirmation_token)
    mail(to: @user.email, subject: "Confirm your account")
  end
end
