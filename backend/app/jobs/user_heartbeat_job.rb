class UserHeartbeatJob < ApplicationJob
  queue_as :default

  def perform(id)
    if Rails.cache.exist?("online:#{id}")
      UserHeartbeatJob.set(wait: 2.minutes).perform_later(id)
    else
      BroadcasterUserStatusJob.perform_later(
        id: id,
        online: false
      )
    end
  end
end
