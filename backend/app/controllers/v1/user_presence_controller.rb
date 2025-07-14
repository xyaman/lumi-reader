class V1::UserPresenceController < ApplicationController
  # @oas_include
  # @tags UserPresence
  # @summary Creates or updates the current user's status
  # @response Success(200) [Hash{last_activity: String}]
  def update
    user = Current.user
    activity_type = params[:activity_type]
    activity_name = params[:activity_name]

    if activity_name.blank?
      return bad_request_response("activity_name is required.")
    end

    presence = UserPresence.set_activity(user.id, activity_type, activity_name)
    BroadcasterUserStatusJob.perform_later(presence)

    success_response({ status: "Ok" }, status: :created)
  end

  # @oas_include
  # @tags UserPresence
  # @summary Retrieves a user's status
  def show
    user = User.find_by(id: params[:user_id])
    return bad_request_response("Invalid user id") unless user
    return success_response({ last_activity: nil, last_book: nil }) unless user.share_status

    presence = UserPresence.get(user.id)
    success_response(presence)
  end

  # @oas_include
  # @tags UserPresence
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
    results = UserPresence.get_batch(users.pluck(:id))

    success_response({ results: results })
  end

  private

  def valid_user_ids?(ids)
    ids.is_a?(Array) && ids.all? { |id| id.to_s =~ /^\d+$/ }
  end
end
