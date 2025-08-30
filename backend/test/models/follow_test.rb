require "test_helper"

class FollowTest < ActiveSupport::TestCase
  def setup
    @user1 = User.create!(email: "user1@example.com", username: "follow1", password: "password")
    @user2 = User.create!(email: "user2@example.com", username: "follow2", password: "password")
  end

  test "user cannot follow themselves" do
    follow = Follow.new(follower: @user1, followed: @user1)
    assert_not follow.valid?
    assert_includes follow.errors[:follower_id], "can't follow yourself"
  end

  test "user can follow another user" do
    follow = Follow.new(follower: @user1, followed: @user2)
    assert follow.valid?
  end

  test "user cannot follow themselves via association" do
    assert_no_difference "Follow.count" do
      assert_raises(ActiveRecord::RecordInvalid) do
        @user1.following << @user1
      end
    end
  end

  test "user can follow another user via association" do
    assert_difference "Follow.count", 1 do
      @user1.following << @user2
    end
    assert @user1.following.include?(@user2)
  end
end
