class User < ApplicationRecord
  include EmailConfirmation

  has_email_confirmation
  has_secure_password

  has_many :sessions, dependent: :destroy
  has_one_attached :avatar

  belongs_to :user_plan

  # normalization
  normalizes :email, with: ->(e) { e.strip.downcase }

  # validations
  before_validation :set_default_user_plan, on: :create
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :username, presence: true, uniqueness: true, length: { minimum: 5 }
  validates :password, length: { minimum: 8 }, if: :password_digest_changed?

  # Users following this user
  has_many :follower_relationships, foreign_key: :followed_id, class_name: "Follow", dependent: :destroy
  has_many :followers, through: :follower_relationships, source: :follower

  # Users this user is following
  has_many :following_relationships, foreign_key: :follower_id, class_name: "Follow", dependent: :destroy
  has_many :following, through: :following_relationships, source: :followed

  def email_confirmed?
    email_confirmed_at.present?
  end

  def confirm_email!
    update_columns(email_confirmed_at: Time.current)
  end

  private

  def set_default_user_plan
    self.user_plan ||= UserPlan.find_by(name: "free")
  end
end
