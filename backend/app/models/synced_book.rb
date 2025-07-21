class SyncedBook < ApplicationRecord
  belongs_to :user
  has_one_attached :compressed_data

  validates :unique_id, presence: true, uniqueness: { scope: :user_id }
end
