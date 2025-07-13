class UserHeartbeatJob < ApplicationJob
  queue_as :default

  def perform(id)
    # Prevent multiple job chains for same user (page reloads, multiple sessions etc)
    lock_key = "heartbeat_lock:#{id}"
    return if Rails.cache.exist?(lock_key)
    Rails.cache.write(lock_key, true, expires_in: 150.seconds)

    last_timestamp = UserCacheService.get_timestamp(id)
    recently_active = last_timestamp && (Time.current.to_i - last_timestamp) < 120

    if UserCacheService.online?(id) && recently_active
      UserHeartbeatJob.set(wait: 2.minutes).perform_later(id)
    else
      UserCacheService.set_offline(id)
      BroadcasterUserStatusJob.perform_later(id: id, online: false)
    end
  end
end
