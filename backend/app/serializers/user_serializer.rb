class UserSerializer
  class << self
    def basic(user)
      {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: avatar_url_for(user)
      }
    end

    def with_presence_status(user)
      basic(user).merge(
        status: UserPresence.online?(user.id)
      )
    end

    def detailed(user, current_user: nil)
      result = basic(user).merge(
        description: user.description,
        share_status: user.share_status,
        following_count: user.following.count,
        followers_count: user.followers.count
      )

      if current_user.present?
        result[:following] = Follow.exists?(follower_id: current_user.id, followed_id: user.id)
      else
        result[:following] = false
      end

      result
    end

    def collection(users)
      users.map { |user| basic(user) }
    end

    def collection_with_status(users)
      users.map { |user| with_presence_status(user) }
    end

    private

    def avatar_url_for(user)
      return nil unless user.avatar.attached?
      Rails.application.routes.url_helpers.url_for(user.avatar)
    end
  end
end
