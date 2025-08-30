class AddPatreonTierToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :patreon_id, :string, null: true
    add_column :users, :patreon_access_token, :string, null: true
    add_column :users, :patreon_refresh_token, :string, null: true
    add_column :users, :patreon_expires_at, :datetime, null: true

    add_index :users, :patreon_id, unique: true
    add_reference :users, :patreon_tier, foreign_key: true, null: true
  end
end
