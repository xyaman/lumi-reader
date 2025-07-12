class UserCacheService
  ONLINE_EXPIRATION = 3.minutes
  ACTIVITY_EXPIRATION = 48.minutes

  class << self
    # Cache key generators
    def online_key(user_id)
      "user:#{user_id}:online"
    end

    def activity_key(user_id)
      "user:#{user_id}:last_activity"
    end

    def timestamp_key(user_id)
      "user:#{user_id}:last_timestamp"
    end

    # Online status methods
    def set_online(user_id, expires_in: ONLINE_EXPIRATION)
      Rails.cache.write(online_key(user_id), true, expires_in: expires_in)
    end

    def set_offline(user_id)
      Rails.cache.delete(online_key(user_id))
    end

    def online?(user_id)
      Rails.cache.exist?(online_key(user_id))
    end

    # Activity methods
    def set_activity(user_id, activity, timestamp = Time.current.to_i)
      Rails.cache.write_multi({
        activity_key(user_id) => activity,
        timestamp_key(user_id) => timestamp
      }, expires_in: ACTIVITY_EXPIRATION)
    end

    def get_activity(user_id)
      Rails.cache.read(activity_key(user_id))
    end

    def get_timestamp(user_id)
      Rails.cache.read(timestamp_key(user_id))
    end

    def get_user_status(user_id)
      cache_keys = [ activity_key(user_id), timestamp_key(user_id) ]
      cache_data = Rails.cache.read_multi(*cache_keys)

      {
        last_activity: cache_data[timestamp_key(user_id)],
        timestamp: cache_data[activity_key(user_id)]
      }
    end

    def get_batch_status(users_ids)
      cache_keys = users_ids.flat_map do |user_id|
        [ activity_key(user_id), timestamp_key(user_id) ]
      end

      cache_data = Rails.cache.read_multi(*cache_keys)

      users_ids.map do |user_id|
      {
        id: user_id,
        last_activity: cache_data[timestamp_key(user_id)],
        timestamp: cache_data[activity_key(user_id)]
      }
      end
    end
  end
end
