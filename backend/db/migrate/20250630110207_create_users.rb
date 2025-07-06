class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :username, null: false
      t.string :password_digest, null: false
      t.string :description
      t.boolean :share_status, default: true, null: false

      # registration mail
      t.string :confirmation_token
      t.datetime :confirmed_at
      t.datetime :confirmation_sent_at

      # TODO: Counter cache columns
      # t.integer :followers_count, default: 0, null: false
      # t.integer :following_count, default: 0, null: false

      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :confirmation_token, unique: true
  end
end
