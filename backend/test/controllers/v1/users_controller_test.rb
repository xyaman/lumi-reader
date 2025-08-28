require "test_helper"

class V1::UsersControllerTest < ActionDispatch::IntegrationTest
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
end
