class ReadingSessionBlueprint < Blueprinter::Base
  identifier :snowflake

  fields :book_id, :book_title, :book_language, :start_time, :end_time, :initial_chars, :curr_chars, :total_reading_time, :created_at, :updated_at
end
