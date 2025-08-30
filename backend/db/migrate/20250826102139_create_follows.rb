class CreateFollows < ActiveRecord::Migration[8.0]
  def change
    create_table :follows do |t|
      t.references :follower, null: false, foreign_key: { to_table: :users }
      t.references :followed, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end

    add_index :follows, [ :follower_id, :followed_id ], unique: true
    add_column :users, :following_count, :integer, default: 0, null: false
    add_column :users, :followers_count, :integer, default: 0, null: false
  end
end
