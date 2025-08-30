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

  # Create some follow relationships between the seeded users
  puts "Seeding follow relationships..."

  # Example: xyaman follows user2 and user3
  xyaman = User.find_by(username: "xyaman")
  user2 = User.find_by(username: "user2")
  user3 = User.find_by(username: "user3")

  if xyaman && user2
    Follow.find_or_create_by!(follower: xyaman, followed: user2)
    puts "xyaman now follows user2"
  end

  if xyaman && user3
    Follow.find_or_create_by!(follower: xyaman, followed: user3)
    puts "xyaman now follows user3"
  end

  # Example: user2 follows xyaman
  if user2 && xyaman
    Follow.find_or_create_by!(follower: user2, followed: xyaman)
    puts "user2 now follows xyaman"
  end
end
