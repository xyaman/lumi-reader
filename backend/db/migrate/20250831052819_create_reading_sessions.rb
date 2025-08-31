class CreateReadingSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :reading_sessions do |t|
      t.integer :snowflake, null: false
      t.references :user, null: false, foreign_key: true

      t.string :book_id, null: false
      t.string :book_title, null: false
      t.string :book_language, null: false
      t.datetime :start_time, null: false
      t.datetime :end_time, null: true
      t.integer :initial_chars, null: false
      t.integer :curr_chars, null: false, default: 0
      t.integer :total_reading_time, null: false, default: 0
      t.timestamps
    end

    add_index :reading_sessions, [ :user_id, :snowflake ], unique: true
    add_index :reading_sessions, :start_time
  end
end
