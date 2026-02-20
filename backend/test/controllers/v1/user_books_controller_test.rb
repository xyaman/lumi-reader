require "test_helper"

class V1::UserBooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    Rails.application.routes.default_url_options[:host] = "localhost:3000"
    @user = users(:xyaman)
    sign_in_as(@user)
  end

  test "should return error when Content-Length exceeds limit" do
    @user.patreon_tier.update!(max_book_size: 1)

    file = fixture_file_upload("test_file.gz", "application/octet-stream")

    process :post, v1_user_books_url, params: { user_book: { compressed_data: file } }, headers: { "Content-Length" => "2000000" }

    assert_response :payload_too_large
    assert_includes @response.body, "cannot exceed 1MB"
  end

  test "admin should bypass Content-Length check" do
    @user.update!(is_admin: true)
    @user.patreon_tier.update!(max_book_size: 1)

    file = fixture_file_upload("test_file.gz", "application/octet-stream")

    post v1_user_books_url, params: {
      user_book: {
        compressed_data: file,
        unique_id: "admin-test-123",
        kind: "ebook",
        title: "Admin Test Book",
        creator: "Author",
        language: "en",
        total_chars: 1000
      }
    }

    assert_response :success
  end
end
