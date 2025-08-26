module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticated?
  end

  class_methods do
    # Unprotected routes may behave differently if the user is logged in.
    # For example, requesting a profile while logged in will indicate whether
    # the logged-in user follows that profile; otherwise, it returns nil.
    def allow_unauthenticated_access(**options)
      skip_before_action :authenticated?, **options
      before_action :resume_session
    end
  end

  private
  def authenticated?
    unless resume_session
      head :unauthorized
      false
    end
  end

  # resume_session assigns the session (if found) to Current.session,
  # updates session.updated_at, and returns the session.
  # Returns nil if no session was found.
  def resume_session
    session = Current.session || find_session_by_cookie
    if session
      # should always be already written, but just in case
      session.touch if session.persisted?
      Current.session = session
    end
  end

  def find_session_by_cookie
    Session.find_by(id: cookies.signed[:session_id]) if cookies.signed[:session_id]
  end

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
