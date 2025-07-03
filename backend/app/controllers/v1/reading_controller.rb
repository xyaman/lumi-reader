class V1::ReadingController < ApplicationController
  # Ensure user is authenticated before allowing creation of reading records
  before_action :authorize_request, only: [ :create ]

  # POST /api/v1/reading
  # Expected JSON body:
  # {
  #   read_at: "2025-07-01T10:00:00Z",         # optional, defaults to current time
  #   characters_read: 1200,                   # number of characters read
  #   reading_time: 300                        # reading duration in seconds
  # }
  #
  # Creates or updates a UserDailyActivity record for the given day.
  def create
    # Parse the read_at timestamp or fall back to current time
    read_time = Time.zone.parse(params[:read_at]) rescue Time.zone.now
    date = read_time.to_date

    # Extract and sanitize input values
    characters = params[:characters_read].to_i
    seconds = params[:reading_time].to_i

    # Find or initialize the activity record for the current user and date
    activity = UserDailyActivity.find_or_initialize_by(user: current_user, date: date)

    # Accumulate characters read and reading time (converted to minutes)
    activity.characters_read += characters
    activity.reading_time += seconds
    activity.save

    # Respond with 201 Created and no body
    head :created
  end

  # GET /api/v1/reading?start=YYYY-MM-DD&end=YYYY-MM-DD&user_id=123
  # Required query param:
  # - user_id: ID of the user to fetch activity for
  # Optional query params:
  # - start: string (start of date range), defaults to 30 days ago
  # - end: string (end of date range), defaults to today
  #
  # Returns a list of daily reading stats for the specified user
  def history
    # Find the user by ID, or return 400 if missing/invalid
    user = User.find_by(id: params[:user_id])
    return render json: { error: "user_id is required or invalid" }, status: :bad_request unless user

    # Parse date range parameters with defaults
    start_date = Date.parse(params[:start]) rescue 30.days.ago.to_date
    end_date = Date.parse(params[:end]) rescue Date.today

    # Fetch reading activity records within date range for the user
    records = UserDailyActivity
      .where(user: user, date: start_date..end_date)
      .order(date: :asc)
      .pluck(:date, :characters_read, :reading_time)

    # Render records as an array of hashes
    render json: records.map { |date, chars, secs|
      {
        date: date,
        characters_read: chars,
        reading_time: secs
      }
    }
  end
end
