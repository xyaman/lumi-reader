class CreatePatreonTiers < ActiveRecord::Migration[8.0]
  def change
    create_table :patreon_tiers do |t|
      t.string :patreon_tier_id, null: false
      t.string :name, null: false
      t.text :description
      t.integer :amount_cents, null: false
      t.boolean :published, null: true
      t.string :image_url

      # features
      t.integer :book_sync_limit, null: false, default: 0

      t.timestamps
    end

    add_index :patreon_tiers, :patreon_tier_id, unique: true
  end
end
