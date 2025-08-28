module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :authenticated?
  end

  class_methods do
    # Allows specific routes to be accessed without authentication.
    # `Current.session` will still be assigned, but has to be checked before
    # accessing it (it might be nil)
    def allow_unauthenticated_access(**options)
      skip_before_action :authenticated?, **options
      before_action :resume_session

      # Configure CSRF protection based on route scope
      if options[:only] && !Rails.env.test?
        # Disable CSRF only for specified routes, keep protection elsewhere
        # Example: allow_unauthenticated_access only: [:show, :index]
        protect_from_forgery with: :exception, except: options[:only]
      else
        protect_from_forgery with: :null_session
      end
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
