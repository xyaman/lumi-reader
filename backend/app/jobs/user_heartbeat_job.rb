class UserHeartbeatJob < ApplicationJob
  queue_as :default

  def perform(id)
    if UserCacheService.online?(id)
      UserHeartbeatJob.set(wait: 2.minutes).perform_later(id)
    else
      BroadcasterUserStatusJob.perform_later(id: id, online: false)
    end
  end
end
