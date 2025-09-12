class AddStatusToReadingSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :reading_sessions, :status, :string, null: false, default: "active"
    add_index :reading_sessions, :status
  end
end
