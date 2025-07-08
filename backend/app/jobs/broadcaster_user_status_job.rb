class BroadcasterUserStatusJob < ApplicationJob
  queue_as :default

  def perform(user_id:, online:, activity: nil)
    activity_key = "user:#{user_id}:last_activity"
    timestamp_key = "user:#{user_id}:timestamp"
    last_activity = activity.presence || (Rails.cache.exist?(activity_key) && Rails.cache.read(activity_key))
    timestamp = (Rails.cache.exist?(timestamp_key) && Rails.cache.read(timestamp_key)) || Time.current

    payload = {
      user_id: user_id,
      online: online,
      last_activity: last_activity,
      timestamp: timestamp
    }

    ActionCable.server.broadcast("user_status:update", payload)
  end
end
