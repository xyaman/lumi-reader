class Follow < ApplicationRecord
  # The user who is following someone
  belongs_to :follower, class_name: "User", foreign_key: :follower_id, counter_cache: true

  # The user being followed
  belongs_to :followed, class_name: "User", foreign_key: :followed_id, counter_cache: true
end
