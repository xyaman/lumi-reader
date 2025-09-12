class ReadingSession < ApplicationRecord
  belongs_to :user

  attribute :status, :string, default: "active"
  validates :status, presence: true, inclusion: { in: %w[ active removed ] }

  validates :snowflake, presence: true, uniqueness: { scope: :user_id }
  validates :chars_read, :time_spent, numericality: { greater_than_or_equal_to: 0 }
  validates :book_id, presence: true
  validates :book_title, presence: true
  validates :book_language, presence: true

  scope :active, -> { where(status: "active") }
  scope :removed, -> { where(status: "removed") }
  scope :recent, -> { order(snowflake: :desc) }
  scope :by_book, -> {
    select(
      :book_id,
      "MAX(book_title) as book_title",
      "MAX(book_language) as book_language",
      "SUM(chars_read) as total_chars_read",
      "SUM(time_spent) as total_time_spent",
      "MAX(snowflake) as last_snowflake"
    )
    .group(:book_id)
  }

  def self.stats_for(user)
    stats = active.where(user: user).select(
      "SUM(time_spent) as total_seconds",
      "COUNT(DISTINCT book_id) as total_books"
    ).first

    total_seconds = stats.total_seconds || 0

    {
      total_reading_hours: (total_seconds/3600.0).round(2),
      total_books: stats.total_books
    }
  end
end

# scope :for_language, ->(language) { where(book_language: language) }
