# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
users = [
  { email: "alice@example.com", username: "alice", description: "Test user Alice" },
  { email: "bob@example.com", username: "bobbob", description: "Test user Bob" },
  { email: "carol@example.com", username: "carol", description: "Test user Carol" }
]

users.each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |user|
    user.username = attrs[:username]
    user.password = "password123"
    user.description = attrs[:description]
    user.share_status = true
    user.confirmed_at = Time.current
  end
end
