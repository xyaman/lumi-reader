class CreateUserBooks < ActiveRecord::Migration[8.0]
  def change
    create_table :user_books do |t|
      t.references :user, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :unique_id, null: false
      t.string :title, null: false
      t.string :creator, null: false # JSON Array
      t.string :language, null: false
      t.integer :total_chars, null: false
      t.integer :curr_chars, null: false, default: 0
      t.integer :curr_paragraph, null: false, default: 0
      t.timestamps
    end

    add_index :user_books, [ :user_id, :unique_id ], unique: true
  end
end
