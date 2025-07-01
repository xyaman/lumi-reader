class UserDailyActivity < ApplicationRecord
  belongs_to :user

  validates :date, presence: true
  validates :characters_read, numericality: { greater_than_or_equal_to: 0 }

  # Reading time in seconds
  validates :reading_time, numericality: { greater_than_or_equal_to: 0 }
end
