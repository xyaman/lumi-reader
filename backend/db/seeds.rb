if ENV["SEED_USERS"]
  puts "Seeding users..."

  users = [
    { email: "xyaman@lumireader.app", username: "xyaman", is_admin: true },
    { email: "user2@lumireader.app", username: "user2", is_admin: false },
    { email: "user3@lumireader.app", username: "user3", is_admin: false }
  ]

  users.each do |attrs|
    User.find_or_create_by!(email: attrs[:email]) do |user|
      user.username = attrs[:username]
      user.password = "jkjkjkjk"
      user.share_online_status = true
      user.share_presence = true
      user.email_confirmed_at = Time.current
      user.is_admin = attrs[:is_admin]
    end
  end
end
