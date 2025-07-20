class CreateReadingSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :reading_sessions do |t|
      t.integer :snowflake, null: false
      t.references :user, null: false, foreign_key: true

      t.string :book_id, null: false
      t.string :book_title, null: false
      t.string :book_language, null: false

      t.integer :start_time, null: false # unix timestamp
      t.integer :end_time, null: true # unix timestamp

      t.integer :initial_chars, null: false
      t.integer :curr_chars, null: false

      t.integer :total_reading_time, null: false
      t.string :status, null: false, default: 'active'  # finished, active
      t.timestamps
    end

    add_index :reading_sessions, [ :user_id, :snowflake ], unique: true
    add_index :reading_sessions, :start_time
    add_index :reading_sessions, :status
  end
end
