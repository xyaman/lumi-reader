class UserHeartbeatJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    if Rails.cache.exist?("online:#{user_id}")
      UserHeartbeatJob.set(wait: 2.minutes).perform_later(user_id)
    else
      BroadcasterUserStatusJob.perform_later(
        user_id: user_id,
        online: false
      )
    end
  end
end
