class Follow < ApplicationRecord
  # The user who is following someone
  belongs_to :follower, class_name: "User", counter_cache: :following_count

  # The user being followed
  belongs_to :followed, class_name: "User", counter_cache: :followers_count
end
