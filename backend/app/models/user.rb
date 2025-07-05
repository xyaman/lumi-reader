class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email, with: ->(e) { e.strip.downcase }
  validates :email, presence: true, uniqueness: true
  validates :username, presence: true, length: { minimum: 5 }

  # Users this user is following
  has_many :following_relationships, foreign_key: :follower_id, class_name: "Follow", dependent: :destroy
  has_many :following, through: :following_relationships, source: :followed

  # Users following this user
  has_many :follower_relationships, foreign_key: :followed_id, class_name: "Follow", dependent: :destroy
  has_many :followers, through: :follower_relationships, source: :follower

  has_one_attached :avatar

  # Class method
  def self.find_by_username(query)
    where("LOWER(username) LIKE ?", "%#{sanitize_sql_like(query.downcase)}%")
  end

  # email confirmation
  def confirmed?
    confirmed_at.present?
  end

  def confirm!
    update_columns(confirmed_at: Time.current, confirmation_token: nil)
  end

  def generate_confirmation_token
    self.confirmation_token = SecureRandom.urlsafe_base64
    self.confirmation_sent_at = Time.current
    self.save!
  end
end
