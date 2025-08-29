class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      # Database auth
      t.string :email, null: false
      t.string :password_digest, null: false

      # Registration mail
      t.datetime :email_confirmed_at
      t.datetime :email_confirmation_sent_at

      # Password reset
      t.datetime :password_reset_at
      t.datetime :password_reset_mail_sent_at

      # User info
      t.string :username, null: false
      t.string :bio
      t.boolean :share_online_status, null: false, default: true
      t.boolean :share_presence, null: false, default: true
      t.boolean :is_admin, null: false, default: false

      t.timestamps
    end

    add_index :users, :email, unique: true
    add_index :users, :username, unique: true
  end
end
