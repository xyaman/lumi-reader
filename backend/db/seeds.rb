users = [
  { email: "xyaman@lumireader.app", username: "xyaman" },
  { email: "user2@lumireader.app", username: "user2" },
  { email: "user3@lumireader.app", username: "user3" }
]

users.each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |user|
    user.username = attrs[:username]
    user.password = "jkjk"
    user.share_status = true
    user.confirmed_at = Time.current
  end
end
