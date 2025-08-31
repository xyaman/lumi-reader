class V1::UserBooksController < ApplicationController
  def index
    user_books = Current.user.user_books.includes(compressed_data_attachment: :blob)
    puts "user_books: #{user_books}"
    render_success data: UserBookBlueprint.render_as_json(user_books)
  end

  def update
    user_book = Current.user.user_books.find_by(unique_id: params[:unique_id])
    return render_error errors: "User Book not found.", status: :not_found unless user_book

    if user_book.update(user_book_params)
      render_success data: UserBookBlueprint.render(user_book)
    else
      render_error errors: user_book.errors.full_messages
    end
  end

  def sync
    result = UserBooks::SyncService.new(Current.user, params[:books]).call

    if result.success?
      render_success data: {
        new_books: UserBookBlueprint.render_as_json(result.new_books),
        updated_books: UserBookBlueprint.render_as_json(result.updated_books)
      }
    else
      render_error errors: result.error
    end
  end

  def upload_data
    user_book = Current.user.user_books.find_by(unique_id: params[:user_book_unique_id])
    unless user_book
      return render_error errors: "User book not found.", status: :not_found
    end

    if params[:compressed_data].blank?
      return render_error errors: "Compressed data is empty."
    end

    url = user_book.attach_compressed_data(params[:compressed_data])
    render_success data: { url: url }
  end

  def destroy
    user_book = Current.user.user_books.find_by(unique_id: params[:unique_id])
    return render_error errors: "User Book not found.", status: :not_found unless user_book

    user_book.compressed_data.purge if user_book.compressed_data.attached?
    user_book.destroy
    render_success message: "User Book deleted successfully."
  end

  private
  def user_book_params
    params.expect(:user_book, [ :kind, :unique_id, :title, :creator, :language, :total_chars, :curr_chars, :curr_paragraph, :updated_at ])
  end
end
