PRESENCE_EXPIRATION  = 48.hours

class UserPresence
  def self.cache_key(user_id)
    "presence:#{user_id}"
  end

  def self.set_online(user_id)
    presence = get(user_id) || {}
    presence[:status] = "online"
    write(user_id, presence)

    presence[:id] = user_id
    presence
  end

  def self.set_offline(user_id)
    presence = get(user_id) || {}
    presence[:status] = "offline"
    write(user_id, presence)

    presence[:id] = user_id
    presence
  end

  def self.online?(user_id)
    presence = get(user_id) || {}
    presence[:status] == "online"
  end

  def self.set_activity(user_id, activity_type, activity_name)
    presence = get(user_id) || {}
    presence[:status] = "online"
    presence[:activity_timestamp] = Time.current
    presence[:activity_type] = activity_type
    presence[:activity_name] = activity_name
    write(user_id, presence)

    presence[:id] = user_id
    presence
  end

  def self.get(user_id)
    Rails.cache.read(cache_key(user_id))
  end

  def self.get_batch(users_ids)
    cache_keys = users_ids.map { |id| cache_key(id) }
    presences = Rails.cache.read_multi(*cache_keys)

    # map cache keys to objects again
    users_ids.map do |id|
      key = cache_key(id)
      presence = presences[key] || {}
      { id: id, **presence }
    end
  end

  def self.write(user_id, data)
    Rails.cache.write(cache_key(user_id), data, expires_in: PRESENCE_EXPIRATION)
  end
end
