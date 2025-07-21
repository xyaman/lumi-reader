require "test_helper"

class V1::SyncedBooksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:xyaman)
    @synced_book = synced_books(:one)
    sign_in_as(@user)
  end

  test "should get index" do
    get "/v1/synced_books"
    assert_response :success
    # body = JSON.parse(response.body)
    # assert_equal @synced_book.unique_id, body["data"]["books"].first["unique_id"]
  end

  test "should update synced_book" do
    assert_equal @synced_book.curr_chars, 100
    patch "/v1/synced_books/#{@synced_book.unique_id}", params: { curr_chars: 200 }
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal body["data"]["book"]["curr_chars"], 200
  end

  test "should sync book: update, create, delete" do
    payload = {
      books: [
        { "unique_id" => "abc", "kind" => "epub", "title" => "New Title", "creator" => "A", "language" => "en", "updated_at" => Time.now, "total_chars" => 100, "curr_chars" => 15, "curr_paragraph" => 2 },
        { "unique_id" => "xyz", "kind" => "epub", "title" => "Brand New", "creator" => "C", "language" => "es", "updated_at" => Time.now, "total_chars" => 300, "curr_chars" => 30, "curr_paragraph" => 3 }
      ]
    }
    post "/v1/synced_books/sync", params: payload, as: :json

    puts "#{response.body}"
    assert_response :success
  end

  test "should remove" do
    delete "/v1/synced_books/#{@synced_book.unique_id}"
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal body["data"]["result"], "ok"
  end
end
