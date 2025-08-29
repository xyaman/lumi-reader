if ENV["SEED_USERS"]
  users = [
    { email: "xyaman@lumireader.app", username: "xyaman", plan: "tier1" },
    { email: "user2@lumireader.app", username: "user2", plan: "free" },
    { email: "user3@lumireader.app", username: "user3", plan: "free" }
  ]

  users.each do |attrs|
    User.find_or_create_by!(email: attrs[:email]) do |user|
      user.username = attrs[:username]
      user.password = "jkjkjkjk"
      user.share_online_status = true
      user.share_presence = true
      user.email_confirmed_at = Time.current
    end
  end
end
