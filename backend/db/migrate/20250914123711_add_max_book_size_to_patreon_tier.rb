class AddMaxBookSizeToPatreonTier < ActiveRecord::Migration[8.0]
  def change
    add_column :patreon_tiers, :max_book_size, :integer, default: 20
  end
end
