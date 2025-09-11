class V1::ReadingSessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ index ]

  def index
    # params:
    # username: string (if it's not present it will try to use Current.user/logged user)
    # offset: number 
    # limit: number
    # group: boolean (true or false)
    # start_date: snowflake format
    # end_date: snowflake format

    user = request_user
    return render_error errors: "User not found." unless user

    offset = params[:offset].to_i
    limit = [ params[:limit].to_i, 50 ].min
    group = params[:group] == "true"

    if params[:start_date].present?
      start_ms = snowflake_from(str: params[:start_date], beginning_of_day: true)
      end_ms = if params[:end_date].present?
        snowflake_from(str: params[:end_date], end_of_day: true)
      else
        snowflake_from(str: params[:start_date], end_of_day: true)
      end
    end

    sessions = user.reading_sessions
    sessions = sessions.where(snowflake: start_ms..end_ms) if params[:start_date].present?

    if group
      paginated_grouped_sessions = sessions
        .by_book
        .order("last_snowflake DESC") # use the scope alias (:snowflake is not available)
        .offset(offset)
        .limit(limit)

      data = paginated_grouped_sessions.map { |s| format_grouped_session(s) }
    else
      data = sessions.order(snowflake: :desc).limit(limit).offset(offset)
    end

    render_success data: data
  end

  def sync
    device_snowflakes = params[:device_snowflakes] || []
    device_snowflakes = device_snowflakes.map(&:to_i)

    updated_since = params[:updated_since].present? ? Date.parse(params[:updated_since]) : nil
    last_snowflake = params[:last_snowflake].to_i
    limit = [ params[:limit].to_i, 500 ].reject(&:zero?).first || 500

    sessions = Current.user.reading_sessions
      .where.not(snowflake: device_snowflakes)
      .where("snowflake > ?", last_snowflake)
      .order(snowflake: :asc)
      .limit(limit)
    sessions = sessions.where("updated_at > ?", updated_since) if updated_since.present?

    render_success data: sessions
  end

  def create
    sessions_params = params.permit(sessions: permitted_session_attributes)
    return render_error errors: "Events must be an array" unless sessions_params[:sessions].is_a?(Array)

    results = []
    valid_sessions_attributes = []

    # 1. Validate first
    sessions_params[:sessions].each do |session_data|
      session = Current.user.reading_sessions.new(session_data)
      if session.valid?
        # Add timestamps for insert_all (it bypasses ActiveRecord callbacks)
        valid_sessions_attributes << session.attributes.merge(
          "created_at" => current_time,
          "updated_at" => current_time
        )
      else
        results << { snowflake: session_data[:snowflake], status: "error", errors: session.errors.full_messages }
      end
    end

    # 2. Bulk insert
    if valid_sessions_attributes.any?
      ReadingSession.insert_all(valid_sessions_attributes)
      valid_sessions_attributes.each do |attrs|
        results << { snowflake: attrs["snowflake"], status: "created" }
      end
    end

    # sort to maintain order
    render_success data: results.sort_by { |r| r[:snowflake] } 
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

  def format_grouped_session(session)
    {
      book_id: session.book_id,
      book_title: session.book_title,
      book_language: session.book_language,
      total_chars_read: session.total_chars_read,
      total_time_spent: session.total_time_spent,
      last_snowflake: session.last_snowflake
    }
  end

  def permitted_session_attributes
    [ :snowflake, :book_id, :book_title, :book_language, :chars_read, :time_spent ]
  end

end
