class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users do |t|
      t.string :email, null: false
      t.string :username, null: false
      t.string :password_digest, null: false
      t.boolean :share_reading_data, default: true, null: false

      t.timestamps
    end
  end
end
