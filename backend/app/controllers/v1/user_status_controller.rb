class V1::UserStatusController < ApplicationController
  # @oas_include
  # @tags Session, UserStatus
  # @summary Creates or updates the current user's status
  # @response Success(200) [Hash{last_activity: String}]
  def update
    user = Current.user

    last_activity = params[:last_activity]
    timestamp = Time.current.to_i

    if last_activity.blank?
      return render json: { error: "last_activity is required." }, status: :bad_request
    end

    # Store raw hashes in cache with 48h expiration
    Rails.cache.write(cache_key(user.id, "timestamp"), timestamp, expires_in: 48.hours)
    Rails.cache.write(cache_key(user.id, "last_activity"), last_activity, expires_in: 48.hours)

    BroadcasterUserStatusJob.perform_later(
      id: user.id,
      online: true,
      activity: last_activity,
    )

    render json: { status: "Ok" }, status: :created
  end

  # @oas_include
  # @tags UserStatus
  # @summary Retrieves a user's status
  def show
    user = User.find_by(id: params[:user_id])
    unless user
      return render json: { error: "Invalid user id" }, status: :bad_request
    end

    unless user.share_status
      return render json: { last_activity: nil, last_book: nil }
    end

    render json: {
      timestamp: Rails.cache.read(cache_key(user.id, "timestamp")),
      last_activity: Rails.cache.read(cache_key(user.id, "last_activity"))
    }
  end

  # @oas_include
  # @tags UserStatus
  # @summary Retrieves status for multiple users
  # @response Success(200) [Hash{ results: Array<Hash{ id: Integer, timestamp: Integer, last_activity: String}>}]
  def batch
    ids = params[:user_ids]

    # Validate input (only accept numbers)
    unless ids.is_a?(Array) && ids.all? { |id| id.to_s =~ /^\d+$/ }
      return render json: { error: "Invalid user_ids param" }, status: :bad_request
    end

    # Limit to 30 users
    # TODO: Add pagination
    if ids.size > 30
      return render json: { error: "Too many user_ids (max. 30)" }, status: :bad_request
    end

    user_ids = ids.map(&:to_i)
    users = User.where(id: user_ids, share_status: true)

    cache_keys = users.flat_map do |user|
      [
        cache_key(user.id, "timestamp"),
        cache_key(user.id, "last_activity")
      ]
    end

    cache_data = Rails.cache.read_multi(*cache_keys)

    results = users.map do |user|
      {
        id: user.id,
        timestamp: cache_data[cache_key(user.id, "timestamp")],
        last_activity: cache_data[cache_key(user.id, "last_activity")]
      }
    end

    render json: { results: results }
  end

  private
  def cache_key(user_id, type)
    "user:#{user_id}:#{type}"
  end
end
