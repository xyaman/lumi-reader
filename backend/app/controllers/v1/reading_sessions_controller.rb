class V1::ReadingSessionsController < ApplicationController

  # @oas_include
  # @tags ReadingSessions
  # @summary Create reading session
  # @parameter reading_session(body) [ReadingSession] Reading session parameters
  # @response Created(201) [ReadingSession]
  def create
    @reading_session = current_user.reading_sessions.build(reading_session_params)

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

    render json: {
      sessions: @reading_sessions.map { |session| session_json(session) }
    }
  end


  # @oas_include
  # @tags ReadingSessions
  # @summary Get sessions metadata since timestamp
  # @response Success(200) [Hash{ last_update: Integer }]
  def metadata
    last_update = current_user.reading_sessions.last&.updated_at&.to_i || 0
    render json: {
      last_update:
    }
  end

  # @oas_include
  # @tags ReadingSessions
  # @summary Update reading session
  # @parameter id(path) [Integer] Reading session ID
  # @parameter reading_session(body) [ReadingSession] Reading session parameters to update
  # @response Success(200) [ReadingSession]
  def update
    @reading_session = current_user.reading_sessions.find_by(snowflake: params[:id])
    if @reading_session&.update(reading_session_params)
      render json: { session: session_json(@reading_session) }
    else
      render json: { errors: @reading_session.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # @oas_include
  # @tags ReadingSessions
  # @summary Delete reading session
  # @parameter id(path) [Integer] Reading session ID
  # @response Success(200) [Hash{message: String}]
  # @response Not Found(404) [Hash{error: String}]
  # @response Unauthorized(401) [Hash{error: String}]
  def destroy
    @reading_session.destroy
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
      :status,
    )
  end
end
