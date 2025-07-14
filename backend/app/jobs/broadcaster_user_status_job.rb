class BroadcasterUserStatusJob < ApplicationJob
  queue_as :default

  # TODO: Rename
  def perform(payload)
    ActionCable.server.broadcast("user_presence:update", payload)

    followers = Follow.where(followed_id: payload[:id]).pluck(:follower_id)

    followers.map do |follower_id|
      UserPresenceChannel.broadcast_to(User.new(id: follower_id), payload)
    end

  end
end
