require "test_helper"

class V1::MeControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:xyaman)
    sign_in_as(@user)
  end

  test "should show current user" do
    get v1_me_url
    assert_response :success
  end

  test "should update user with valid params" do
    patch v1_me_url, params: { user: { bio: "New bio" } }
    assert_response :success
    @user.reload
    assert_equal "New bio", @user.bio
  end

  test "should not update user with invalid params" do
    patch v1_me_url, params: { user: { share_presence: nil } }
    assert_response :unprocessable_content
  end

  test "should return error if avatar missing" do
    post avatar_v1_me_url
    assert_response :unprocessable_content
    assert_includes @response.body, "Missing avatar file"
  end

  test "should upload avatar successfully" do
    file = fixture_file_upload("avatar.webp", "image/webp")

    assert_not @user.avatar.attached?
    @user.avatar.stubs(:attach)
    post avatar_v1_me_url, params: { avatar: file }
    assert_response :success
  end

  # test "should return error if avatar too big" do
  #   file = fixture_file_upload("avatar.webp", "image/webp")
  #
  #   post avatar_v1_me_url, params: { avatar: file }
  #   assert_response :unprocessable_content
  # end


  # test "should return error if avatar upload fails" do
  # end
end
