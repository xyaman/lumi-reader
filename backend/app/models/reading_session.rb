class ReadingSession < ApplicationRecord
  belongs_to :user

  validates :snowflake, presence: true, uniqueness: { scope: :user_id }
  validates :chars_read, :time_spent, numericality: { greater_than_or_equal_to: 0 }
  validates :book_id, presence: true
  validates :book_title, presence: true
  validates :book_language, presence: true

  scope :recent, -> { order(snowflake: :desc) }

  # TODO: use subquery
  def self.by_book(limit = 50, offset = 0)
    group(:book_id, :book_title, :book_language)
    .pluck(
      :book_id,
      :book_title,
      :book_language,
      "SUM(chars_read) AS total_chars_read",
      "SUM(time_spent) AS total_time_spent",
      "MAX(snowflake) AS last_snowflake"
    )
  end

  def self.stats_for(user)
    sessions = where(user: user)
    total_seconds = sessions.sum(:time_spent)
    {
      total_books: sessions.select(:book_id).distinct.count,
      total_reading_hours: (total_seconds / 3600.0).round(2)
    }
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
end
