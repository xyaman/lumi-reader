class UserPresenceChannel < ApplicationCable::Channel
  def subscribed
    @filtered_user_ids = []
    @current_user_id = current_user&.id
    # stream_from "user_presence:update", ->(payload) { filtered_broadcast(payload) }
    stream_for current_user

    update_user_status(online: true)
    schedule_heartbeat_check
  end

  def update_filter(data)
    @filtered_user_ids = Array(data["user_ids"]).map(&:to_i)
  end

  def heartbeat
    # Called by the client periodically (1 min max)
    update_user_status(online: true)
  end

  def unsubscribed
    update_user_status(online: false)
  end

  private

  def update_user_status(online:)
    return unless @current_user_id

    # Update cache
    if online
      presence = UserPresence.set_online(@current_user_id)
    else
      presence = UserPresence.set_offline(@current_user_id)
    end

    # Broadcast the status change
    BroadcasterUserStatusJob.perform_later(presence)
  end

  def schedule_heartbeat_check
    @heartbeat_job = UserHeartbeatJob.set(wait: 2.minutes).perform_later(@current_user_id)
  end

  def filtered_broadcast(raw_payload)
    payload = JSON.parse(raw_payload)
    user_id = payload["id"]
    return unless @filtered_user_ids.include?(user_id)
    transmit(payload)
  end
end
