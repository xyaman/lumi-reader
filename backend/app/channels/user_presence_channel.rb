class UserPresenceChannel < ApplicationCable::Channel
  def subscribed
    stream_for current_user
    current_user.set_online!
  end

  def unsubscribed
    current_user.set_offline!
  end
end
