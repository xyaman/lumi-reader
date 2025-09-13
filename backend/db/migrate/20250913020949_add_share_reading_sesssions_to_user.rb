class AddShareReadingSesssionsToUser < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :share_reading_sessions, :boolean, null: false, default: true
  end
end
