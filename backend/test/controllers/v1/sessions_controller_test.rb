require "test_helper"

class V1::SessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:xyaman)
  end

  test "should create session on successful login" do
    post v1_session_url, params: { credentials: { email: @user.email, password: "jkjk" } }, as: :json
    assert_response :ok
  end

  test "should not create session with invalid password" do
    post v1_session_url, params: { credentials: { email: @user.email, password: "wrong_password" } }, as: :json
    assert_response :unauthorized
  end

  test "should show user when logged in" do
    sign_in_as(@user)
    get v1_session_url, as: :json
    assert_response :ok
  end

  test "should destroy session on logout" do
    sign_in_as(@user)
    delete v1_session_url, as: :json
    assert_response :no_content
  end

  test "should not show user when not logged in" do
    get v1_session_url, as: :json
    assert_response :unauthorized
  end

  test "should not destroy session when not logged in" do
    delete v1_session_url, as: :json
    assert_response :unauthorized
  end
end
