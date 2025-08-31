class ReadingSession < ApplicationRecord
  belongs_to :user

  validates :snowflake, presence: true, uniqueness: { scope: :user_id }
  validates :start_time, presence: true
  validates :total_reading_time, numericality: { greater_than_or_equal_to: 0 }, allow_nil: false
  scope :for_date_range, ->(start_date, end_date) { where(start_time: start_date..end_date) }
end
