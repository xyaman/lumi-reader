class Follow < ApplicationRecord
  # The user who is following someone
  belongs_to :follower, class_name: "User", counter_cache: :following_count

  # The user being followed
  belongs_to :followed, class_name: "User", counter_cache: :followers_count

  validates :follower_id, uniqueness: { scope: :followed_id }

  validate :follower_cannot_follow_self

  private
  def follower_cannot_follow_self
    if follower_id == followed_id
      errors.add(:follower_id, "can't follow yourself")
    end
  end
end
