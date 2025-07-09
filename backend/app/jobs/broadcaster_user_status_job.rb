class BroadcasterUserStatusJob < ApplicationJob
  queue_as :default

  def perform(id:, online:, activity: nil)
    activity_key = "user:#{id}:last_activity"
    timestamp_key = "user:#{id}:timestamp"
    last_activity = activity.presence || (Rails.cache.exist?(activity_key) && Rails.cache.read(activity_key))
    timestamp = (Rails.cache.exist?(timestamp_key) && Rails.cache.read(timestamp_key)) || nil

    payload = {
      id: id,
      online: online,
      last_activity: last_activity,
      timestamp: timestamp
    }

    ActionCable.server.broadcast("user_status:update", payload)
  end
end
