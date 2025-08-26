plans = [
  { name: "free", book_sync_limit: 3 },
  { name: "tier1", book_sync_limit: 20 }
]

plans.each do |attrs|
  UserPlan.find_or_create_by!(name: attrs[:name]) do |up|
    up.book_sync_limit = attrs[:book_sync_limit]
  end
end

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
      user.user_plan = UserPlan.find_by(name: attrs[:plan])
    end
  end
end
