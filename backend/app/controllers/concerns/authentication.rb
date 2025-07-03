module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticated?
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :authenticated?, **options
    end
  end

  private
  # @return [bool] the current session or nil if not authenticated
  def authenticated?
    unless resume_session
      head :unauthorized
      false
    end
  end

  # @return [Session, nil] the current session after resuming or finding by cookie
  def resume_session
    Current.session ||= find_session_by_cookie
  end

  # @return [Session, nil] the session found by cookie, or nil if not found
  def find_session_by_cookie
    Session.find_by(id: cookies.signed[:session_id]) if cookies.signed[:session_id]
  end

  # @param user [User] the user to start a session for
  # @return [Session] the newly created session
  def start_new_session_for(user)
    user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session|
      Current.session = session
      cookies.signed.permanent[:session_id] = {
        value: session.id,
        httponly: true,
        secure: Rails.env.production?,
        same_site: :lax
      }
    end
  end

  def terminate_session
    Current.session.destroy
    cookies.delete(:session_id)
  end
end
