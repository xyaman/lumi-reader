class User < ApplicationRecord
  has_secure_password
  validates :email, presence: true, uniqueness: true
  validates :nickname, presence: true, length: { minimum: 5 }

  # Users this user is following
  has_many :following_relationships, foreign_key: :follower_id, class_name: "Follow", dependent: :destroy
  has_many :following, through: :following_relationships, source: :followed

  # Users following this user
  has_many :follower_relationships, foreign_key: :followed_id, class_name: "Follow", dependent: :destroy
  has_many :followers, through: :follower_relationships, source: :follower

  def self.find_by_nickname(query)
    where("LOWER(nickname) LIKE ?", "%#{sanitize_sql_like(query.downcase)}%").limit(20)
  end
end
