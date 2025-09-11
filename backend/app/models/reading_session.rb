class ReadingSession < ApplicationRecord
  belongs_to :user

  validates :snowflake, presence: true, uniqueness: { scope: :user_id }
  validates :chars_read, :time_spent, numericality: { greater_than_or_equal_to: 0 }
  validates :book_id, presence: true
  validates :book_title, presence: true
  validates :book_language, presence: true

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
    stats = where(user: user).select(
      "SUM(time_spent) as total_seconds",
      "COUNT(DISTINCT book_id) as total_books"
    ).first

    total_seconds = stats.total_seconds || 0

    {
      total_reading_hours: (total_seconds/3600).round(2),
      total_total_books: stats.total_books
    }
  end
end

# scope :for_language, ->(language) { where(book_language: language) }

# def self.stats(date = Date.current)
#   start_miliseconds = date.beginning_of_day.to_i * 1000
#   end_miliseconds = date.end_ofday.to_i * 1000
#   events = where(snowflake: start_miliseconds..end_miliseconds)
#   {
#     total_time: events.sum(:time_spent),
#     total_chars: events.sum(:chars_read),
#     books_read: events.distinct.count(:book_id),
#     sessions: events.where(event_type: "session_end").count
#   }
# end
