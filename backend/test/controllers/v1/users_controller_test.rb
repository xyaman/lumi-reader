require "test_helper"

class V1::UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user_xyaman = users(:xyaman)
    @user4 = users(:user4)
    @user5 = users(:user5)
  end

  test "should follow user" do
    sign_in_as(@user_xyaman)
    assert_difference("Follow.count") do
      put follow_v1_user_url(username: @user4.username)
    end
    assert_response :success
  end

  test "should not follow a user that is already followed" do
    sign_in_as(@user_xyaman)
    @user_xyaman.following << @user4
    assert_no_difference("Follow.count") do
      put follow_v1_user_url(username: @user4.username)
    end
    assert_response :unprocessable_content
  end

  test "should not follow a non-existent user" do
    sign_in_as(@user_xyaman)
    assert_no_difference("Follow.count") do
      put follow_v1_user_url(username: "nonexistent")
    end
    assert_response :not_found
  end

  test "should not follow yourself" do
    sign_in_as(@user_xyaman)
    assert_no_difference("Follow.count") do
      put follow_v1_user_url(username: @user_xyaman.username)
    end
    assert_response :unprocessable_content
  end

  test "should unfollow user" do
    sign_in_as(@user_xyaman)
    @user_xyaman.following << @user4
    assert_difference("Follow.count", -1) do
      put unfollow_v1_user_url(username: @user4.username)
    end
    assert_response :success
  end

  test "should not unfollow a user that is not followed" do
    sign_in_as(@user_xyaman)
    assert_no_difference("Follow.count") do
      put unfollow_v1_user_url(username: @user4.username)
    end
    assert_response :unprocessable_content
  end

  test "should not unfollow a non-existent user" do
    sign_in_as(@user_xyaman)
    assert_no_difference("Follow.count") do
      put unfollow_v1_user_url(username: "nonexistent")
    end
    assert_response :not_found
  end

  test "should show user" do
    user = users(:xyaman)
    get v1_user_url(username: user.username)
    assert_response :success
    json = JSON.parse(@response.body)
    assert_equal user.username, json["data"]["username"]
  end

  test "should return error for missing user" do
    get v1_user_url(username: "nonexistentuser")
    assert_response :unprocessable_content
    json = JSON.parse(@response.body)
    assert_equal Array.wrap("User not found."), json["errors"]
  end

  test "should show user following" do
    user = users(:xyaman)
    get following_v1_user_url(username: user.username)
    assert_response :success
    json = JSON.parse(@response.body)
    assert_equal 2, json["data"].size
  end

  test "should show user followers" do
    user = users(:xyaman)
    get followers_v1_user_url(username: user.username)
    assert_response :success
    json = JSON.parse(@response.body)
    assert_equal 1, json["data"].size
  end

  test "should return an empty array when user is not following anyone" do
    user = users(:user3)
    get following_v1_user_url(username: user.username)
    assert_response :success

    json_response = JSON.parse(@response.body)
    assert_equal [], json_response["data"]
  end

  test "should return not found for followers of a non-existent user" do
    get followers_v1_user_url(username: "nonexistent")
    assert_response :not_found

    json_response = JSON.parse(@response.body)
    assert_equal Array.wrap("User not found."), json_response["errors"]
  end
end
