require "test_helper"

class V1::AuthControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:xyaman)
    sign_in_as(@user)
  end

  test "should unlink patreon id" do
    get v1_auth_patreon_unlink_url
    assert_response :success
  end

  test "should generate patreon url" do
    get v1_auth_patreon_generate_url
    assert_response :success
  end
end
