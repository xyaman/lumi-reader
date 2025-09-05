class CreateReadingEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :reading_events do |t|
      t.bigint :snowflake, null: false    # client-generated snowflake
      t.references :user, null: false, foreign_key: true

      # Book info
      t.string :book_id, null: false # reference a user_books.unique_id (may not exist)
      t.string :book_title, null: false
      t.string :book_language, null: false

      t.datetime :timestamp, null: false
      t.integer :chars_read, null: false, default: 0
      t.integer :time_spent, null: false, default: 0
      t.string :event_type, null: false

      t.timestamps
    end

    add_index :reading_events, [ :user_id, :snowflake ], unique: true
    add_index :reading_events, :timestamp
    add_index :reading_events, [ :book_id, :timestamp ]
  end
end
