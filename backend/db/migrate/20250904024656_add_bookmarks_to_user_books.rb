class AddBookmarksToUserBooks < ActiveRecord::Migration[8.0]
  def change
    add_column :user_books, :bookmarks, :json
  end
end
