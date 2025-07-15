# ApiResponse concern provides an unified response format for all API endpoints
#
# All API responses follows this structure
#
# {
#   success: boolean  # Indicates if the request was successful
#   status: string    # HTTP status code as string
#   data: any         # Optional: Response data payload
#   errors: array     # Optional: Array of error strings
# }
module ApiResponse
  extend ActiveSupport::Concern

  private

  def api_response(data: nil, errors: nil, status: :ok)
    response = {
      success: errors.nil?,
      status: status.to_s
    }

    response[:data] = data if data.present?
    response[:errors] = format_error(errors) if errors.present?

    render json: response, status: status
  end

  def success_response(data, status: :ok)
    api_response(data: data, status: status)
  end

  def created_response(data = nil)
    api_response(data: data, status: :created)
  end

  def no_content_response
    head :no_content
  end

  # Error responses
  def error_response(errors, status: :unprocessable_entity)
    api_response(errors: errors, status: status)
  end

  def not_found_response(errors = "Resource not found")
    api_response(errors: errors, status: :not_found)
  end

  def unauthorized_response(errors = "Unauthorized")
    api_response(errors: errors, status: :unauthorized)
  end

  def bad_request_response(errors)
    api_response(errors: errors, status: :bad_request)
  end

  # Common error responses
  def user_not_found_response
    not_found_response("User not found")
  end

  def format_error(errors)
    return errors if errors.is_a?(Array)
    [ errors ]
  end
end
