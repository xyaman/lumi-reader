require "test_helper"

class V1::AuthControllerTest < ActionDispatch::IntegrationTest
  test "should get patreon" do
    get v1_auth_patreon_url
    assert_response :success
  end
end
