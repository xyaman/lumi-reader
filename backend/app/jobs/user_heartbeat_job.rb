class UserHeartbeatJob < ApplicationJob
  queue_as :default

  def perform(id)
    # Prevent multiple job chains for same user (page reloads, multiple sessions etc)
    lock_key = "heartbeat_lock:#{id}"
    return if Rails.cache.exist?(lock_key)
    Rails.cache.write(lock_key, true, expires_in: 150.seconds)

    if UserPresence.online?(id)
      UserHeartbeatJob.set(wait: 2.minutes).perform_later(id)
    else
      presence = UserPresence.set_offline(id)
      BroadcasterUserStatusJob.perform_later(presence)
    end
  end
end
