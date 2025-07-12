class V1::UserStatusController < ApplicationController
  # @oas_include
  # @tags Session, UserStatus
  # @summary Creates or updates the current user's status
  # @response Success(200) [Hash{last_activity: String}]
  def update
    user = Current.user

    last_activity = params[:last_activity]

    if last_activity.blank?
      return render json: { error: "last_activity is required." }, status: :bad_request
    end

    UserCacheService.set_activity(user.id, last_activity)

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

    user_status = UserCacheService.get_user_status(user.id)
    render json: user_status
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
    batch_status = UserCacheService.get_batch_status(users)
    render json: { results: batch_status }
  end
end
