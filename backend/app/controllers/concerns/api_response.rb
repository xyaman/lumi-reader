module ApiResponse
  extend ActiveSupport::Concern

  private

  # Success responses
  def success_response(data, status: :ok)
    render json: data, status: status
  end

  def created_response(data = nil)
    if data
      render json: data, status: :created
    else
      head :created
    end
  end

  def no_content_response
    head :no_content
  end

  # Error responses
  def error_response(message, status: :unprocessable_entity)
    render json: { error: message }, status: status
  end

  def validation_error_response(errors)
    formatted_errors = errors.is_a?(Array) ? errors : errors.full_messages
    render json: { errors: formatted_errors }, status: :unprocessable_entity
  end

  def not_found_response(message = "Resource not found")
    render json: { error: message }, status: :not_found
  end

  def unauthorized_response(message = "Unauthorized")
    render json: { error: message }, status: :unauthorized
  end

  def bad_request_response(message)
    render json: { error: message }, status: :bad_request
  end

  # Common error responses
  def user_not_found_response
    not_found_response("User not found")
  end
end
