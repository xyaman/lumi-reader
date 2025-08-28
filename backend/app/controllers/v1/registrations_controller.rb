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

  private

  def sign_up_params
    params.expect(user: %i[email username password password_confirmation])
  end
end
