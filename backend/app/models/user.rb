class User < ApplicationRecord
  include EmailConfirmation

  has_email_confirmation
  has_secure_password

  has_many :sessions, dependent: :destroy
  has_many :user_books, dependent: :destroy

  has_many :reading_sessions, dependent: :destroy
  has_many :reading_events, dependent: :destroy

  has_one_attached :avatar

  belongs_to :patreon_tier, optional: false

  # normalization
  normalizes :email, with: ->(e) { e.strip.downcase }

  # validations
  before_validation :set_default_patreon_tier, on: :create
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }, if: :password_digest_changed?
  validates :share_online_status, inclusion: { in: [ true, false ] }
  validates :share_presence, inclusion: { in: [ true, false ] }

  normalizes :username, with: ->(u) { u.strip.downcase }
  validates :username, presence: true, uniqueness: { case_sensitive: false }, length: { minimum: 5 }

  # Users following this user
  has_many :follower_relationships, foreign_key: :followed_id, class_name: "Follow", dependent: :destroy
  has_many :followers, through: :follower_relationships, source: :follower

  # Users this user is following
  has_many :following_relationships, foreign_key: :follower_id, class_name: "Follow", dependent: :destroy
  has_many :following, through: :following_relationships, source: :followed

  scope :search, ->(query) { where("LOWER(username) LIKE ?", "%#{sanitize_sql_like(query.downcase)}%").limit(10) }

  def email_confirmed?
    email_confirmed_at.present?
  end

  def confirm_email!
    update_columns(email_confirmed_at: Time.current)
  end

  def can_create_book?
    return true if is_admin?
    user_books.count < patreon_tier.book_sync_limit
  end

  def can_update_book?
    return true if is_admin?
    user_books.count <= patreon_tier.book_sync_limit
  end

  def unlink_patreon!
    update!(
      patreon_id: nil,
      patreon_access_token: nil,
      patreon_refresh_token: nil,
      patreon_expires_at: nil,
      patreon_tier: PatreonTier.find_by(name: "Free")
    )
  end

  def patreon_linked?
    !!patreon_id
  end

  def avatar_url
    return nil unless avatar.attached?
    Rails.application.routes.url_helpers.url_for(avatar)
  end

  def set_online!
    presence = Rails.cache.read(presence_cache_key) || {}
    presence[:status] = "online"
    presence[:last_update] = Time.current.to_i
    Rails.cache.write(presence_cache_key, presence, expires_in: 48.hours)
    broadcast_presence(presence)
  end

  def set_offline!
    presence = Rails.cache.read(presence_cache_key)
    if presence
      presence[:status] = "offline"
      presence[:last_update] = Time.current.to_i
      Rails.cache.write(presence_cache_key, presence, expires_in: 48.hours)
      broadcast_presence(presence)
    end
  end

  def presence
    cached_presence = Rails.cache.read(presence_cache_key) || { status: "offline" }

    # Check if last_update exists and is older than 5 minutes
    # If it's older set user offline and update the presence (websocket)
    if cached_presence[:last_update] && cached_presence[:status] == "online"
      last_update_time = Time.at(cached_presence[:last_update])
      if Time.current - last_update_time > 5.minutes
        cached_presence[:status] = "offline"
        Rails.cache.write(presence_cache_key, cached_presence, expires_in: 48.hours)
        broadcast_presence(cached_presence)
      end
    end

    cached_presence
  end

  def set_presence_activity!(type:, name:)
    presence = Rails.cache.read(presence_cache_key) || {}

    # Every time presence is updated, it means the user is online
    presence[:status] = "online"
    presence[:last_update] = Time.current.to_i
    presence[:activity_timestamp] = Time.current.to_i
    presence[:activity_type] = type
    presence[:activity_name] = name

    Rails.cache.write(presence_cache_key, presence, expires_in: 48.hours)
    broadcast_presence(presence)
  end

  private

  def broadcast_presence(new_presence)
    return unless share_online_status
    followers.each do |follower|
      UserPresenceChannel.broadcast_to(follower, {
        user_id: id,
        presence: new_presence
      })
    end
  end

  def presence_cache_key
    "user_presence:#{id}"
  end

  def set_default_patreon_tier
    self.patreon_tier = PatreonTier.find_by(name: "Free")
  end
end
