class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection
  include Pagy::Backend

  include Authentication
  include ApiResponse

  before_action :set_csrf_cookie
  allow_unauthenticated_access only: %i[ csrf ]

  if Rails.env.test?
    protect_from_forgery with: :null_session
  else
    protect_from_forgery with: :exception
  end

  # GET /csrf
  def csrf
    head :ok
  end

  def set_csrf_cookie
    cookies["CSRF-TOKEN"] = {
      value: form_authenticity_token,
      same_site: :lax,
      secure: Rails.env.production?,
      domain: Rails.env.production? ? ".lumireader.app" : nil
    }
  end
end
