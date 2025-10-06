class CreateReadingSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :reading_sessions do |t|
      t.bigint :snowflake, null: false    # client-generated snowflake
      t.references :user, null: false, foreign_key: true

      # Book info
      t.string :book_id, null: false # reference a user_books.unique_id (may not exist)
      t.string :book_title, null: false
      t.string :book_language, null: false

      t.integer :chars_read, null: false, default: 0
      t.integer :time_spent, null: false, default: 0

      t.timestamps
    end

    add_index :reading_sessions, [ :user_id, :snowflake ], unique: true
    add_index :reading_sessions, [ :user_id, :book_id ]
  end
end
