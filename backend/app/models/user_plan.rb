class UserPlan < ApplicationRecord
  has_many :users
  enum :name, free: "free", tier1: "tier1"

  validates :name, presence: true, uniqueness: true
end
