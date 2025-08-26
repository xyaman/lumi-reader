require "test_helper"

class V1::RegistrationsControllerTest < ActionDispatch::IntegrationTest
  test "should create user with valid params" do
    initial_count = User.count
    post v1_registrations_url, params: {
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
      post v1_registrations_url, params: {
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
end
