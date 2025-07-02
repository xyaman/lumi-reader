class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection
  include Authentication

  protect_from_forgery with: :exception
  before_action :set_csrf_cookie

  # GET /csfr
  def csrf
    head :ok
  end

  def set_csrf_cookie
    cookies["CSRF-TOKEN"] = form_authenticity_token
  end
end
