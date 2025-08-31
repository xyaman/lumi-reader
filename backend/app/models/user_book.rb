class UserBook < ApplicationRecord
  belongs_to :user
  has_one_attached :compressed_data

  validates :unique_id, presence: true, uniqueness: { scope: :user_id }

  def attach_compressed_data(file)
    compressed_data.attach(file)
  end
end
