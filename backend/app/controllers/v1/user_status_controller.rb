class V1::UserStatusController < ApplicationController
  # @oas_include
  # @tags Session, UserStatus
  # @summary Creates or updates the current user's status
  # @response Success(200) [Hash{last_activity: String}]
  def update
    user = Current.user
    last_activity = params[:last_activity]

    if last_activity.blank?
      return bad_request_response("last_activity is required.")
    end

    UserCacheService.set_activity(user.id, last_activity)

    BroadcasterUserStatusJob.perform_later(
      id: user.id,
      online: true,
      activity: last_activity
    )

    success_response({ status: "Ok" }, status: :created)
  end

  # @oas_include
  # @tags UserStatus
  # @summary Retrieves a user's status
  def show
    user = User.find_by(id: params[:user_id])
    return bad_request_response("Invalid user id") unless user
    return success_response({ last_activity: nil, last_book: nil }) unless user.share_status

    status = UserCacheService.get_user_status(user.id)
    success_response(status)
  end

  # @oas_include
  # @tags UserStatus
  # @summary Retrieves status for multiple users
  # @response Success(200) [Hash{ results: Array<Hash{ id: Integer, timestamp: Integer, last_activity: String}>}]
  def batch
    ids = params[:user_ids]

    unless valid_user_ids?(ids)
      return bad_request_response("Invalid user_ids param")
    end

    if ids.size > 30
      return bad_request_response("Too many user_ids (max. 30)")
    end

    user_ids = ids.map(&:to_i)
    users = User.where(id: user_ids, share_status: true)
    results = UserCacheService.get_batch_status(users.pluck(:id))

    success_response({ results: results })
  end

  private

  def valid_user_ids?(ids)
    ids.is_a?(Array) && ids.all? { |id| id.to_s =~ /^\d+$/ }
  end
end
