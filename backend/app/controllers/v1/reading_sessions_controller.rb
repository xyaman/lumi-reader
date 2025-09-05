class V1::ReadingSessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ index ]

  def index
    user = request_user
    return render_error errors: "User not found." unless user

    offset = params[:offset].to_i || 0
    limit = [ params[:limit].to_i, 50 ].min
    group = params[:group] == "true"

    sessions = user.reading_sessions

    if params[:start_date].present?
      start_ms = snowflake_from(str: params[:start_date], beginning_of_day: true)
      end_ms = if params[:end_date].present?
        snowflake_from(str: params[:end_date], end_of_day: true)
      else
        snowflake_from(str: params[:start_date], end_of_day: true)
      end

      sessions = sessions.where(snowflake: start_ms..end_ms)
    end

    if group
      sessions = sessions.by_book.map do |book_id, title, lang, chars, time, last_snowflake|
        {
          book_id: book_id,
          book_title: title,
          book_language: lang,
          total_chars_read: chars,
          total_time_spent: time,
          last_snowflake: last_snowflake
        }
      end
    else
      sessions = sessions.order(snowflake: :desc).limit(limit).offset(offset)
    end

    render_success data: sessions
  end


  def create
    sessions_params = params[:sessions]
    return render_error errors: "Events must be an array" unless sessions_params.is_a?(Array)

    results = []
    sessions_params.each do |session_data|
      session = Current.user.reading_sessions.new(
        snowflake: session_data[:snowflake],
        book_id: session_data[:book_id],
        book_title: session_data[:book_title],
        book_language: session_data[:book_language],
        chars_read: session_data[:chars_read],
        time_spent: session_data[:time_spent],
      )

      if session.save
        results << { snowflake: session_data[:snowflake], status: "created" }
      else
        results << { snowflake: session_data[:snowflake], status: "error", errors: session.errors.full_messages }
      end
    end

    render_success data: results
  end

  private

  def request_user
    User.find_by(username: params[:username]) || Current.user
  end

  def snowflake_from(str: nil, date: nil, beginning_of_day: false, end_of_day: false)
    raise ArgumentError, "Invalid snowflake argument provided" unless str || date
    date ||= Date.parse(str)

    if beginning_of_day
      date.beginning_of_day.to_i * 1000
    elsif end_of_day
      date.end_of_day.to_i * 1000
    else
      date.to_i * 1000
    end
  end

end
