class UserBookBlueprint < Blueprinter::Base
  identifier :unique_id

  fields :kind, :title, :creator, :language, :total_chars, :curr_chars, :curr_paragraph, :created_at, :updated_at
  field :compressed_data_url do |book, _options|
    if book.compressed_data.attached?
      Rails.application.routes.url_helpers.url_for(book.compressed_data)
    end
  end
end
