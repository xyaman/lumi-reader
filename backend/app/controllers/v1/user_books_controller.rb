class V1::UserBooksController < ApplicationController
  before_action :check_file_size, only: [ :create ]

  def index
    if params[:light].present?
      user_books = Current.user.user_books
      return render_success data: UserBookBlueprint.render_as_json(user_books, view: :minimal)
    end
    user_books = Current.user.user_books
    render_success data: UserBookBlueprint.render_as_json(user_books, view: :default)
  end

  def create
    return render_error errors: "Book limit reached." unless Current.user.can_create_book?

    unless params[:user_book] && params[:user_book][:compressed_data].present?
      return render_error errors: "Compressed data is required."
    end

    compressed_file = params[:user_book][:compressed_data]
    unless compressed_file.content_type == "application/octet-stream"
      return render_error errors: "File type not allowed. Please upload a compressed book file."
    end

    user_book = Current.user.user_books.new(user_book_params)

    begin
      user_book.compressed_data.attach(params[:user_book][:compressed_data])
    rescue ActiveStorage::Error => e
      return render_error errors: "Failed to attach compressed data: #{e.message}", status: :unprocessable_entity
    end

    max_size = Current.user.patreon_tier.max_book_size.megabytes
    if user_book.compressed_data.blob.byte_size > max_size
      user_book.compressed_data.purge
      return render_error errors: "File size exceeds #{Current.user.patreon_tier.max_book_size}MB limit.", status: :payload_too_large
    end

    if user_book.save
      # the frontend sends this value too, use it if its present
      # so we have correct updated_at (may differ from the DB)
      if params[:user_book][:updated_at].present?
        user_book.update_column(:updated_at, params[:user_book][:updated_at])
      end
      render_success data: UserBookBlueprint.render_as_json(user_book), status: :created
    else
      render_error errors: user_book.errors.full_messages
    end
  end

  def update
    return render_error errors: "Book limit reached." unless Current.user.can_update_book?

    user_book = Current.user.user_books.find_by(unique_id: params[:unique_id])
    return render_error errors: "User Book not found.", status: :not_found unless user_book

    if user_book.update(user_book_params)
      render_success data: UserBookBlueprint.render_as_json(user_book)
    else
      render_error errors: user_book.errors.full_messages
    end
  end

  def sync
    incoming_book = params[:user_book]
    if incoming_book.blank?
      return render_error errors: "book must be present in the body."
    end

    # does the book exists in the server?
    server_book = Current.user.user_books.find_by(unique_id: incoming_book["unique_id"])
    unless server_book
      return render_error errors: "request book wasn't found in the server."
    end

    # check dates
    begin
      incoming_updated_at = Time.iso8601(incoming_book["updated_at"])
    rescue ArgumentError => e
      return render_error errors: "Invalid date format: #{e.message}"
    end

    if incoming_updated_at > server_book.updated_at
      if server_book.update(user_book_params)
        render_success data: nil
      else
        render_error errors: server_book.errors.full_messages
      end
    else
      render_success data: UserBookBlueprint.render_as_json(server_book, view: :default)
    end
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
    permitted = params.require(:user_book).permit(
      :kind, :unique_id, :title, :creator, :language, :total_chars,
      :curr_chars, :curr_paragraph, :updated_at, :bookmarks
    )

    # Handle JSON string from FormData (:create)- parse it if it's a string
    if permitted[:bookmarks].present? && permitted[:bookmarks].is_a?(String)
      begin
        permitted[:bookmarks] = JSON.parse(permitted[:bookmarks])
      rescue JSON::ParserError
        permitted[:bookmarks] = []
      end
    end
    permitted
  end

  def check_file_size
    return true if Current.user&.is_admin?

    max_size = Current.user&.patreon_tier.max_book_size
    content_length = request.headers["Content-Length"].to_i
    if content_length > max_size.megabytes
      render_error errors: "Request size cannot exceed #{max_size}MB.", status: :payload_too_large
      return false
    end

    true
  end
end
