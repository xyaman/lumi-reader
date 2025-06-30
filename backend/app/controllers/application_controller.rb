class ApplicationController < ActionController::API
  include ActionController::Cookies

  def current_user
    return @current_user if @current_user

    token = cookies.signed[:jwt]
    begin
      decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
      user_id = decoded[0]["user_id"]
      @current_user = User.find_by(id: user_id)
      render json: { email: @current_user.email, status: :authorized }
     @current_user
    rescue JWT::DecodeError, JWT::ExpiredSignature
      render json: { status: :not_loggedin }
    end
  end

  def authorize_request
    token = cookies.signed[:jwt]
    begin
      decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
      user_id = decoded[0]["user_id"]
      @current_user = User.find_by(id: user_id)
    rescue JWT::DecodeError, JWT::ExpiredSignature
      render json: { status: :unauthorized }
    end
  end

  # Sets the JWT token in a signed, secure, HTTP-only cookie
  def set_jwt_cookie(token)
    cookies.signed[:jwt] = {
      value: token,
      httponly: true,
      secure: Rails.env.production?, # Only use https in production
      same_site: :lax,
      expires: 24.hours.from_now
    }
  end

  # Encodes a JWT token with payload and expiration
  # Payload is expected to be the user id
  def encode_token(payload, exp = 24.hours.from_now)
    payload[:ext] = exp.to_i
    JWT.encode(payload, jwt_secret, "HS256")
  end


  private
  def jwt_secret
    Rails.application.credentials.secret_key_base
  end
end
