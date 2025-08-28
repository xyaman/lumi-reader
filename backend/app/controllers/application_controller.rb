class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection
  include Pagy::Backend

  include Authentication

  before_action :set_csrf_cookie
  allow_unauthenticated_access only: %i[ csrf ]

  rescue_from ActionController::ParameterMissing,  with: :render_parameter_missing
  rescue_from ActionController::InvalidAuthenticityToken, with: :render_csrf_token_missing

  if Rails.env.test?
    protect_from_forgery with: :null_session
  else
    protect_from_forgery with: :exception
  end

  def csrf
    head :ok
  end

  private

  def set_csrf_cookie
    cookies["CSRF-TOKEN"] = {
      value: form_authenticity_token,
      same_site: :lax,
      secure: Rails.env.production?,
      domain: Rails.env.production? ? ".lumireader.app" : nil
    }
  end

  def render_csrf_token_missing(exception)
    render_error(errors: exception.message, status: :unprocessable_content)
  end

  def render_parameter_missing(exception)
    render_error(errors: exception.message, status: :unprocessable_content)
  end

  def render_success(data: nil, message: "Operation finished successfully", status: :ok)
    render json: { status: "success", data: data, message: message }, status: status
  end

  def render_error(errors:, status: :unprocessable_content)
    render json: { status: "error", errors: Array.wrap(errors), message: nil }, status: status
  end
end
