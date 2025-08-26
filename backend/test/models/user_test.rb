require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "finds user by valid password reset token" do
    user = users(:xyaman)
    token = user.password_reset_token
    retrieved_user = User.find_by_password_reset_token(token)
    assert_not_nil retrieved_user
    assert_equal user.id, retrieved_user.id
  end

  test "finds user by valid email confirmation token" do
    user = users(:xyaman)
    token = user.email_confirmation_token
    retrieved_user = User.find_by_email_confirmation_token(token)
    assert_not_nil retrieved_user
    assert_equal user.id, retrieved_user.id
  end

  test "returns nil for invalid password reset token" do
    retrieved_user = User.find_by_password_reset_token("invalid_token")
    assert_nil retrieved_user
  end

  test "returns nil for invalid email confirmation token" do
    retrieved_user = User.find_by_email_confirmation_token("invalid_token")
    assert_nil retrieved_user
  end
end
