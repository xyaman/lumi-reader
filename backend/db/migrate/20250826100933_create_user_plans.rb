class CreateUserPlans < ActiveRecord::Migration[8.0]
  def change
    create_table :user_plans do |t|
      t.string :name, null: false
      t.integer :book_sync_limit, null: false, default: 0

      t.timestamps
    end

    add_index :user_plans, :name, unique: true
    add_reference :users, :user_plan, null: false, foreign_key: true
  end
end
