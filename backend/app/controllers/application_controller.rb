class ApplicationController < ActionController::API
  include ActionController::Cookies

  def current_user
    return @current_user if defined?(@current_user)
    token = cookies.signed[:jwt]
    return nil unless token
    begin
      decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
      user_id = decoded[0]["user_id"]
      @current_user = User.find_by(id: user_id)
    rescue JWT::DecodeError, JWT::ExpiredSignature
      @current_user = nil
    end
  end


  protected

  def authorize_request
    unless current_user
      render json: { status: :unauthorized }, status: :unauthorized
    end
  end

  def set_jwt_cookie(token)
    cookies.signed[:jwt] = {
      value: token,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      expires: 24.hours.from_now
    }
  end

  def encode_token(payload, exp = 24.hours.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, jwt_secret, "HS256")
  end

  private

  def jwt_secret
    Rails.application.credentials.secret_key_base
  end
end
