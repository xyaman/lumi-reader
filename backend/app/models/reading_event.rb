class ReadingEvent < ApplicationRecord
  belongs_to :user

  validates :snowflake, presence: true, uniqueness: { scope: :user_id }
  validates :event_type, inclusion: { in: %w[ session_start reading_progress session_end ] }
  validates :chars_read, :time_spent, numericality: { greater_than_or_equal_to: 0 }
  validates :timestamp, presence: true

  validates :book_id, presence: true
  validates :book_title, presence: true
  validates :book_language, presence: true

  scope :recent, -> { order(timestamp: :desc) }
  scope :for_language, ->(language) { where(book_language: language) }


  def self.stats(date = Date.current)
    events = where(timestamp: date.beginning_of_day..date.end_of_day)
    {
      total_time: events.sum(:time_spent),
      total_chars: events.sum(:chars_read),
      books_read: events.distinct.count(:book_id),
      sessions: events.where(event_type: "session_end").count
    }
  end
end
