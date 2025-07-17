class V1::ReadingSessionsController < ApplicationController

  # @oas_include
  # @tags ReadingSessions
  # @summary Create reading session
  # @parameter reading_session(body) [ReadingSession] Reading session parameters
  # @response Created(201) [ReadingSession]
  def create
    @reading_session = current_user.reading_sessions.new(reading_session_params)

    if @reading_session.save
      render json: { session: session_json(@reading_session) }, status: :created
    else
      render json: { errors: @reading_session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # @oas_include
  # @tags ReadingSessions
  # @summary Get reading sessions
  # @parameter start_date(query) [String] Filter sessions from this date (unix timestamp)
  # @parameter end_date(query) [String] Filter sessions to this date (unix timestamp)
  # @parameter status(query) [String] Filter by session status - enum: finished, active
  # @response Success(200) [Hash{sessions: Array<ReadingSession>}]
  # @response Unauthorized(401) [Hash{error: String}]
  def index
    @reading_sessions = current_user.reading_sessions

    # Filter by date range if provided
    if params[:start_date].present? && params[:end_date].present?
      end_date = params[:end_date]
      start_date = params[:start_date]
      @reading_sessions = @reading_sessions.for_date_range(start_date, end_date)
    end

    success_response({ sessions: @reading_sessions.map { |session| session_json(session) } })
  end


  # @oas_include
  # @tags ReadingSessions
  # @summary Report differences in reading sessions between client and server
  # @parameter last_sync_time(query) [Integer] Last sync timestamp (unix)
  # @parameter local_sessions_ids(query) [Array<String>] List of local session snowflake IDs
  # @response Success(200) [Hash{modified_sessions: Array<ReadingSession>, remote_only_sessions: Array<ReadingSession>, sync_timestamp: Integer}]
  def diff
    last_sync = params[:last_sync_time]&.to_i || 0
    local_sessions_ids = params[:local_sessions_ids] || []

    # Get all modified sessions since last_sync
    modified_sessions = current_user.reading_sessions
      .where.not(snowflake: local_sessions_ids)
      .where("updated_at > ?", Time.at(last_sync))

    # Get sessions that doesn't exist in this device
    remote_only_sessions = current_user.reading_sessions
      .where.not(snowflake: local_sessions_ids)
      .where("created_at > ?", Time.at(last_sync))

    success_response({
      modified_sessions: modified_sessions.map { |s| session_json(s) },
      remote_only_sessions: remote_only_sessions.map { |s| session_json(s) },
      sync_timestamp: Time.current.to_i
    })
  end

  # @oas_include
  # @tags ReadingSessions
  # @summary Update reading session
  # @parameter id(path) [Integer] Reading session ID
  # @parameter reading_session(body) [ReadingSession] Reading session parameters to update
  # @response Success(200) [ReadingSession]
  def update
    reading_session = current_user.reading_sessions.find_by(snowflake: params[:id])
    return error_response("Session not found", status: :not_found) unless reading_session

    if reading_session.update(reading_session_params)
      success_response({ session: session_json(reading_session) })
    else
      error_response(reading_session.errors.full_messages)
    end
  end

  # @oas_include
  # @tags ReadingSessions
  # @summary Batch update reading sessions
  # @parameter sessions(body) [Array<ReadingSession>] Array of reading session objects to update or create
  # @response Success(200) [Hash{results: Array<Hash{snowflake: String, status: String, server_version?: ReadingSession, client_version?: ReadingSession}>}]
  def batch_update
    return error_response("sessions is empty") unless params[:sessions].present?
    # TODO: Validate array

    results = []

    params[:sessions].each do |client_session|
      session = current_user.reading_sessions.find_by(snowflake: client_session.snowflake)
      if session
        # check for conflicts using updated_at timestamps
        if client_session[:updated_at] < session.updated_at
          # server version is newer, conflict detected
          results << {
            snowflake: session.snowflake,
            status: "conflict",
            server_version: session_json(session),
            client_version: session_json(client_session)
          }
        else
          # safe to update
          session.update(client_session)

          results << {
            snowflake: session.snowflake,
            status: "updated"
          }
        end
      else
        # the session doesnt exist in the server - create it
        current_user.reading_sessions.create(client_session)

        results << {
          snowflake: client_session.snowflake,
          status: "created"
        }
      end
    end

    success_response({ results: results })
  end

  # @oas_include
  # @tags ReadingSessions
  # @summary Delete reading session
  # @parameter id(path) [Integer] Reading session ID
  # @response Success(200) [Hash{message: String}]
  # @response Not Found(404) [Hash{error: String}]
  # @response Unauthorized(401) [Hash{error: String}]
  def destroy
    reading_session = current_user.reading_sessions.find_by(snowflake: params[:id])
    reading_session.destroy
    render json: { message: "Reading session deleted successfully" }
  end

  private

  def current_user
    Current.user
  end

  def session_json(session)
    {
      snowflake: session.snowflake,
      user_id: session.user_id,
      book_id: session.book_id,
      book_title: session.book_title,
      language: session.book_language,
      start_time: session.start_time,
      end_time: session.end_time,
      total_reading_time: session.total_reading_time,
      status: session.status,
      updated_at: session.updated_at
    }
  end

  def reading_session_params
    params.require(:reading_session).permit(
      :snowflake,
      :book_id,
      :book_title,
      :book_language,
      :start_time,
      :end_time,
      :total_reading_time,
      :status
    )
  end
end
