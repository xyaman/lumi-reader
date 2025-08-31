require "ostruct"

class UserBooks::SyncService
  def initialize(user, books_data)
    @user = user
    @books_data = books_data
  end

  def call
    return error("books_data is empty.") if @books_data.blank?

    # book uuid
    unique_ids = @books_data.map { |b| b["unique_id"] }
    return error("You can only sync up to #{@user.sync_limit} books.") if sync_limit_exceeded?(unique_ids)

    ActiveRecord::Base.transaction do
      updated_books = update_existing_books
      new_books = create_new_books
      delete_missing_books(unique_ids)

      success(new_books: new_books, updated_books: updated_books)
    end
  end

  private

  def sync_limit_exceeded?(unique_ids)
    after_sync_count = (@user.user_books.pluck(:unique_id) | unique_ids).size
    after_sync_count > @user.sync_limit
  end

  def update_existing_books
    existing = @user.user_books.where(unique_id: @books_data.map { |b| b["unique_id"] }).index_by(&:unique_id)
    return_books = []

    @books_data.filter_map do |data|
      if (existing_book = existing[data["unique_id"]])
        incoming_updated_at = Time.iso8601(data["updated_at"])
        if incoming_updated_at > existing_book.updated_at
          existing_book.update!(
            kind: data["kind"],
            title: data["title"],
            creator: data["creator"],
            language: data["language"],
            updated_at: data["updated_at"],
            total_chars: data["total_chars"],
            curr_chars: data["curr_chars"],
            curr_paragraph: data["curr_paragraph"],
          )
        else
          return_books << existing_book
        end
      end
    end

    return_books
  end

  def create_new_books
    existing_ids = @user.user_books.pluck(:unique_id)
    new_books_data = @books_data.reject { |b| existing_ids.include?(b["unique_id"]) }

    new_books_data.map do |data|
      data = data.permit(:kind, :unique_id, :title, :creator, :language, :total_chars, :curr_chars, :curr_paragraph, :updated_at)
      @user.user_books.create!(
        kind: data["kind"],
        unique_id: data["unique_id"],
        title: data["title"],
        creator: data["creator"],
        language: data["language"],
        updated_at: data["updated_at"],
        total_chars: data["total_chars"],
        curr_chars: data["curr_chars"],
        curr_paragraph: data["curr_paragraph"]
      )
    end
  end

  def delete_missing_books(unique_ids)
    @user.user_books.where.not(unique_id: unique_ids).destroy_all
  end

  def success(new_books:, updated_books:)
    OpenStruct.new(success?: true, new_books:, updated_books:)
  end

  def error(message)
    OpenStruct.new(success?: false, error: message)
  end

  def synced_books_params
  end
end
