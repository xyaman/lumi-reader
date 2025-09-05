class V1::ReadingEventsController < ApplicationController
  def index
    events = Current.user.reading_events
      .order(timestamp: desc)
      .limit(50)
      .offset(params[:offset].to_i || 0)

    render_success data: events
  end

  def create
    events_params = params[:events]
    return render_error errors: "Events must be an array" unless events_params.is_a?(Array)

    results = []
    events_params.each do |event_data|
      event = Current.user.reading_events.new(
        snowflake: event_data[:snowflake],
        book_id: event_data[:book_id],
        book_title: event_data[:book_title],
        book_language: event_data[:book_language],
        timestamp: event_data[:timestamp],
        chars_read: event_data[:chars_read],
        time_spent: event_data[:time_spent],
        event_type: event_data[:event_type]
      )

      if event.save
        results << { id: event_data[:snowflake], status: "created" }
      else
        results << { id: event_data[:snowflake], status: "error", errors: event.errors.full_messages }
      end
    end

    render_success data: results
  end
end
