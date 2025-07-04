class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :username, null: false
      t.string :password_digest, null: false
      t.boolean :share_reading_data, default: true, null: false

      # TODO: Counter cache columns
      # t.integer :followers_count, default: 0, null: false
      # t.integer :following_count, default: 0, null: false

      t.timestamps
    end
    add_index :users, :email, unique: true
  end
end
