class V1::ReadingSessionsController < ApplicationController
  def create
    reading_session = Current.user.reading_sessions.new(reading_session_params)
    if reading_session.save
      render_success data: ReadingSessionBlueprint.render_as_json(reading_session), status: :created
    else
      render_error errors: reading_session.errors.full_messages
    end
  end

  def index
    # note: Array(nil) returns []
    local_sessions_ids = params[:local_sessions_ids]&.split(",")&.map(&:to_i) || []
    last_sync = params[:last_sync_time]&.to_i || 0

    # Get all modified sessions since last_sync
    modified_sessions = Current.user.reading_sessions
      .where("updated_at > ?", Time.at(last_sync))

    # Get sessions that doesn't exist in this device
    remote_only_sessions = Current.user.reading_sessions
      .where.not(snowflake: local_sessions_ids)

    render_success data: {
      modified_sessions: ReadingSessionBlueprint.render_as_json(modified_sessions),
      remote_only_sessions: ReadingSessionBlueprint.render_as_json(remote_only_sessions),
      sync_timestamp: Time.current
    }
  end

  def show
    reading_session = Current.user.reading_sessions.find_by(snowflake: params[:snowflake])
    if reading_session
      render_success data: ReadingSessionBlueprint.render_as_json(reading_session)
    else
      render_error errors: "Reading Session not found.", status: :not_found
    end
  end

  def update
    reading_session = Current.user.reading_sessions.find_by(snowflake: params[:snowflake])
    return render_error errors: "Reading Session not found.", status: :not_found unless reading_session

    if reading_session.update(reading_session_params)
      render_success message: "Reading Session updated successfully."
    else
      render_error errors: reading_session.errors.full_messages
    end
  end

  def batch_update
    sessions = params[:sessions]
    return render_error errors: "Invalid parameters: `sessions` is not present." unless sessions
    return render_error errors: "Invalid parameters: `sessions` must be an array." unless sessions.is_a?(Array)


    results = sessions.map do |client_session|
      permitted = client_session.permit(:snowflake, :book_id, :book_title, :book_language, :start_time, :end_time, :total_reading_time, :status, :initial_chars)
      client_updated_at = Time.iso8601(client_session[:updated_at])
      permitted[:updated_at] = client_updated_at
      session = Current.user.reading_sessions.find_by(snowflake: client_session[:snowflake])

      if session
        # check for conflicts using updated_at timestamps
        if client_updated_at < session.updated_at
          # server version is newer, conflict detected
          {
            snowflake: session.snowflake,
            status: "conflict",
            server_version: ReadingSessionBlueprint.render_as_json(session),
            client_version: client_session
          }
        elsif session.updated_at < client_updated_at
          # safe to update
          session.update(permitted)

          {
            snowflake: session.snowflake,
            status: "updated"
          }
        end
      else
        # the session doesnt exist in the server - create it
        Current.user.reading_sessions.create(permitted)
        {
          snowflake: client_session[:snowflake],
          status: "created"
        }
      end
    end

    render_success data: results.compact
  end

  def destroy
    reading_session = Current.user.reading_sessions.find_by(snowflake: params[:snowflake])
    return render_error errors: "Reading Session not found.", status: :not_found unless reading_session

    reading_session.destroy
    render_success message: "Reading session deleted successfully."
  end

  private

  def reading_session_params
    params.expect(reading_session: [
      :snowflake,
      :book_id,
      :book_title,
      :book_language,
      :start_time,
      :end_time,
      :initial_chars,
      :curr_chars,
      :total_reading_time
    ])
  end
end
