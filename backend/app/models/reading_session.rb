class ReadingSession < ApplicationRecord
  belongs_to :user

  validates :snowflake, presence: true, uniqueness: { scope: :user_id }
  validates :start_time, presence: true
  validates :status, inclusion: { in: %w[active finished] }
  validates :total_reading_time, numericality: { greater_than_or_equal_to: 0 }, allow_nil: false

  scope :active, -> { where(status: "active") }
  scope :finished, -> { where(status: "finished") }
  scope :for_date_range, ->(start_date, end_date) { where(start_time: start_date..end_date) }
  scope :recent, -> { order(start_time: :desc) }
end
