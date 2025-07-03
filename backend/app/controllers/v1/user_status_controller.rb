class V1::UserStatusController < ApplicationController
  before_action :authorize_request

  # POST /api/v1/user_status
  # BODY: { last_activity: timestamp, last_book: title }
  # Requires authorize_request
  def create
    last_activity = params[:last_activity]
    last_book = params[:last_book]

    if last_activity.blank? || last_book.blank?
      return render json: { error: "Both last_activity and last_book are required." }, status: :bad_request
    end

    # Store raw hashes in cache with 24h expiration
    Rails.cache.write(cache_key(current_user.id, "last_activity"), last_activity, expires_in: 24.hours)
    Rails.cache.write(cache_key(current_user.id, "last_book"), last_book, expires_in: 24.hours)

     render json: { status: "Ok" }, status: :created
  end

  # GET /api/v1/user_status?user_id=...
  # Returns cached data or null if expired/not set
  # Require auth
  def retrieve
    user = User.find_by(id: params[:user_id])
    unless user
      return render json: { error: "Invalid user id" }, status: :bad_request
    end

    unless user.share_reading_data
      return render json: { last_activity: nil, last_book: nil }
    end

    render json: {
      last_activity: Rails.cache.read(cache_key(user.id, "last_activity")),
      last_book: Rails.cache.read(cache_key(user.id, "last_book"))
    }
  end

  # GET /api/v1/user_status/batch?user_ids[]=1&user_ids[]=2
  # Returns status for specific user IDs
  # Requires authorization
  def batch
    ids = params[:user_ids]

    # Validate input (only accept numbers)
    unless ids.is_a?(Array) && ids.all? { |id| id.to_s =~ /^\d+$/ }
      return render json: { error: "Invalid user_ids param" }, status: :bad_request
    end

    # Limit to 10 users
    if ids.size > 10
      return render json: { error: "Too many user_ids (max. 10)" }, status: :bad_request
    end

    user_ids = ids.map(&:to_i)
    users = User.where(id: user_ids, share_reading_data: true)

    results = users.map do |user|
      {
        user_id: user.id,
        last_activity: Rails.cache.read(cache_key(user.id, "last_activity")),
        last_book: Rails.cache.read(cache_key(user.id, "last_book"))
      }
    end

    render json: results
  end

  private
  def cache_key(user_id, type)
    "user:#{user_id}:#{type}"
  end
end
