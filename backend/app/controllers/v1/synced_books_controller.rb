class V1::SyncedBooksController < ApplicationController
  allow_unauthenticated_access only: %i[ ]

  def index
    synced_books = current_user.synced_books.includes(compressed_data_attachment: :blob)
    success_response({ books: synced_books.map { |book|  book_json(book) } })
  end

  # @oas_include
  # @summary updates a synced book metadata
  def update
    synced_book = current_user.synced_books.find_by(unique_id: params[:unique_id])
    return not_found_response unless synced_book

    if synced_book.update(synced_books_params)
      success_response({ book: book_json(synced_book) })
    else
      error_response(synced_book.errors.full_messages, status: :unprocessable_entity)
    end
  end

  def sync
    return error_response("books is empty") unless params[:books].present?
    request_books = params[:books]
    request_unique_ids = request_books.map { |book| book["unique_id"] }

    books_after_sync = (current_user.synced_books.pluck(:unique_id) | request_unique_ids).size
    if books_after_sync > current_user.sync_limit
      return error_response("You can only sync up to #{current_user.sync_limit} books.")
    end

    existing_books = current_user.synced_books.where(unique_id: request_unique_ids).index_by(&:unique_id)

    # update existing books
    updated_books = []
    request_books.each do |book_data|
      if existing_books[book_data["unique_id"]]
        book = existing_books[book_data["unique_id"]]
        book.update!(
          kind: book_data["kind"],
          unique_id: book_data["unique_id"],
          title: book_data["title"],
          creator: book_data["creator"],
          language: book_data["language"],
          updated_at: book_data["updated_at"],
          total_chars: book_data["total_chars"],
          curr_chars: book_data["curr_chars"],
          curr_paragraph: book_data["curr_paragraph"]
        )

        updated_books << book
      end
    end

    existing_ids = existing_books.keys
    new_books_data = request_books.reject { |book| existing_ids.include?(book["unique_id"]) }
    new_books = new_books_data.map do |book_data|
      current_user.synced_books.create!(
          kind: book_data["kind"],
          unique_id: book_data["unique_id"],
          title: book_data["title"],
          creator: book_data["creator"],
          language: book_data["language"],
          updated_at: book_data["updated_at"],
          total_chars: book_data["total_chars"],
          curr_chars: book_data["curr_chars"],
          curr_paragraph: book_data["curr_paragraph"]
      )
    end

    # Delete books not present anymore
    current_user.synced_books.where.not(unique_id: request_unique_ids).destroy_all

    success_response({
      new_books: new_books.map { |b| book_json(b) },
      updated_books: updated_books.map { |b| book_json(b) }
    })

  end

  def upload_data
    synced_book = current_user.synced_books.find_by(unique_id: params[:unique_id])
    return not_found_response unless synced_book

    compressed_data = params[:compressed_data]
    if compressed_data.blank?
      return error_response("Missing data")
    end

    synced_book.compressed_data.attach(compressed_data)
    compressed_data_url = url_for(synced_book.compressed_data)
    success_response({ url: compressed_data_url })
  end

  def destroy
    synced_book = current_user.synced_books.find_by(unique_id: params[:unique_id])
    return not_found_response unless synced_book

    synced_book.destroy
    success_response({ "result": "ok" })
  end

  private
  def book_json(book)
    {
      kind: book.kind,
      unique_id: book.unique_id,
      title: book.title,
      creator: book.creator,
      language: book.language,
      total_chars: book.total_chars,
      curr_chars: book.curr_chars,
      curr_paragraph: book.curr_paragraph,
      updated_at: book.updated_at.to_i,
      created_at: book.created_at.to_i,
      compressed_data_url: compressed_data_url_for(book)
    }
  end

  def synced_books_params
    params.permit(:kind, :unique_id, :title, :creator, :language, :total_chars, :curr_chars, :curr_paragraph, :updated_at)
  end

  def compressed_data_url_for(book)
    return nil unless book.compressed_data.attached?
    Rails.application.routes.url_helpers.url_for(book.compressed_data)
  end

  def current_user
    Current.user
  end
end
