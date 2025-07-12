class BroadcasterUserStatusJob < ApplicationJob
  queue_as :default

  # TODO: Rename
  def perform(id:, online:, activity: nil)
    last_activity = activity.presence || UserCacheService.get_activity(id)
    timestamp = UserCacheService.get_timestamp(id)

    payload = {
      id: id,
      online: online,
      last_activity: last_activity,
      timestamp: timestamp
    }

    ActionCable.server.broadcast("user_status:update", payload)
  end
end
