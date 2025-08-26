require "test_helper"

class V1::PasswordResetsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:xyaman)
  end

  test "should send password reset email if user exists" do
    assert_emails 1 do
      post v1_password_resets_url, params: { email: @user.email }, as: :json
    end

    assert_response :success
  end

  test "should return success even if user does not exist" do
    assert_no_emails do
      post v1_password_resets_url, params: { email: "nonexistent@example.com" }, as: :json
    end

    assert_response :success
  end

  test "should update password with valid token" do
    token = @user.password_reset_token
    patch v1_password_reset_url(token), params: {
      password_reset: {
        password: "new_password",
        password_confirmation: "new_password"
      }
    }, as: :json

    assert_response :success
    assert @user.reload.authenticate("new_password")
  end

  test "should not update password with invalid token" do
    patch v1_password_reset_url("invalid_token"), params: {
      password_reset: {
        password: "new_password",
        password_confirmation: "new_password"
      }
    }, as: :json

    assert_response :unprocessable_content
  end

  test "should not update password with expired token" do
    token = @user.password_reset_token
    travel 3.hours
    patch v1_password_reset_url(token), params: {
      password_reset: {
        password: "new_password",
        password_confirmation: "new_password"
      }
    }, as: :json

    assert_response :unprocessable_content
  end

  test "should not update password if passwords mismatch" do
    token = @user.password_reset_token
    patch v1_password_reset_url(token), params: {
      password_reset: {
        password: "new_password",
        password_confirmation: "mismatch"
      }
    }, as: :json

    assert_response :unprocessable_content
  end
end
