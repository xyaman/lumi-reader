class CreateUserDailyActivities < ActiveRecord::Migration[8.0]
  def change
    create_table :user_daily_activities do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.integer :characters_read, default: 0
      t.integer :reading_time, default: 0

      t.timestamps
    end

    add_index :user_daily_activities, [ :user_id, :date ], unique: true
  end
end
