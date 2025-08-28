require "test_helper"

class V1::RegistrationsControllerTest < ActionDispatch::IntegrationTest
  test "should create user with valid params" do
    initial_count = User.count
    post v1_registration_url, params: {
      user: {
        email: "test@example.com",
        username: "testuser",
        password: "password123",
        password_confirmation: "password123"
      }
    }, as: :json

    assert_response :created
    json = JSON.parse(response.body)
    assert_equal "testuser", json["data"]["username"]
    assert_equal "test@example.com", json["data"]["email"]

    assert_equal User.count, initial_count + 1
  end

  test "should not create user with invalid params" do
    assert_no_difference("User.count") do
      post v1_registration_url, params: {
        user: {
          email: "",
          username: "",
          password: "short",
          password_confirmation: "mismatch"
        }
      }, as: :json
    end

    assert_response :unprocessable_content
    json = JSON.parse(response.body)
    assert json["errors"].present?
  end

  test "should confirm user with valid token" do
    user = User.create!(
      email: "confirm@example.com",
      username: "confirmuser",
      password: "password123",
      password_confirmation: "password123",
    )

    valid_token = user.email_confirmation_token
    get confirm_v1_registration_url, params: { token: valid_token, api: true }
    assert_response :success
    assert user.reload.email_confirmed?
  end

  test "should not confirm user with invalid token" do
    user = User.create!(
      email: "confirm@example.com",
      username: "confirmuser",
      password: "password123",
      password_confirmation: "password123",
    )

    valid_token = "invalid token"
    get confirm_v1_registration_url, params: { token: valid_token, api: true }
    assert_response :unprocessable_content
    assert not user.reload.email_confirmed?
  end

  test "should not confirm after 24 hours with a valid token" do
    user = User.create!(
      email: "confirm@example.com",
      username: "confirmuser",
      password: "password123",
      password_confirmation: "password123",
    )

    valid_token = user.email_confirmation_token
    travel 25.hours

    get confirm_v1_registration_url, params: { token: valid_token, api: true }
    assert_response :unprocessable_content
    assert not user.reload.email_confirmed?
  end
end
