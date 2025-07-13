module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private
    def find_verified_user
      session_id = cookies.signed[:session_id]
      # TODO: sessions are may be nil
      session = Session.includes(:user).find_by(id: session_id)
      session.user || reject_unauthorized_connection
    end
  end
end
