require "test_helper"

class V1::ReadingSessionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:xyaman)
    @reading_session = reading_sessions(:one)
    sign_in_as(@user)
  end

  test "should get index" do
    get v1_reading_sessions_url, params: { last_sync_time: 3.days.ago.to_i }
    assert_response :success
    json = JSON.parse(@response.body)
    assert_not_empty json["data"]["modified_sessions"]
  end

  test "should create reading_session" do
    assert_difference("ReadingSession.count") do
      post v1_reading_sessions_url, params: { reading_session: { snowflake: 4, book_id: "111", book_title: "New Book", book_language: "en", start_time: Time.now, initial_chars: 0 } }
    end
    assert_response :created
  end

  test "should update reading_session" do
    patch v1_reading_session_url(@reading_session.snowflake), params: { reading_session: { total_reading_time: 9000 } }
    assert_response :success
    @reading_session.reload
    assert_equal 9000, @reading_session.total_reading_time
  end

  test "should destroy reading_session" do
    assert_difference("ReadingSession.count", -1) do
      delete v1_reading_session_url(@reading_session.snowflake)
    end
    assert_response :success
  end

  test "should batch update reading sessions" do
    sessions_to_update = [
      { snowflake: @reading_session.snowflake, total_reading_time: 9999, updated_at: (Time.now + 1.hour).iso8601 },
      { snowflake: reading_sessions(:two).snowflake, total_reading_time: 8888, updated_at: (Time.now + 1.hour).iso8601 }
    ]

    put batch_update_v1_reading_sessions_url, params: { sessions: sessions_to_update }
    assert_response :success

    @reading_session.reload
    assert_equal 9999, @reading_session.total_reading_time

    reading_sessions(:two).reload
    assert_equal 8888, reading_sessions(:two).total_reading_time
  end

  test "should not update if client version is older" do
    original_time = @reading_session.total_reading_time
    sessions_to_update = [
      { snowflake: @reading_session.snowflake, total_reading_time: 9999, updated_at: (Time.now - 1.hour).iso8601 },
    ]

    put batch_update_v1_reading_sessions_url, params: { sessions: sessions_to_update }
    assert_response :success
    json = JSON.parse(@response.body)
    assert_equal "conflict", json["data"][0]["status"]

    @reading_session.reload
    assert_equal original_time, @reading_session.total_reading_time
  end

  test "should create new session if it does not exist in batch update" do
    assert_difference("ReadingSession.count") do
      sessions_to_update = [
        { snowflake: 999, book_id: "new_book", book_title: "New Book", book_language: "en", start_time: Time.now, initial_chars: 0, updated_at: Time.now.iso8601 }
      ]
      put batch_update_v1_reading_sessions_url, params: { sessions: sessions_to_update }
    end
    assert_response :success
    json = JSON.parse(@response.body)
    assert_equal "created", json["data"][0]["status"]
  end

  test "should not create reading_session with invalid params" do
    assert_no_difference("ReadingSession.count") do
      post v1_reading_sessions_url, params: { reading_session: { book_id: "111" } }
    end
    assert_response :unprocessable_entity
  end

  test "should not update reading_session with invalid params" do
    patch v1_reading_session_url(@reading_session.snowflake), params: { reading_session: { start_time: nil } }
    assert_response :unprocessable_entity
  end

  test "should not destroy another user reading session" do
    cookies.delete(:session_id)
    sign_in_as(users(:user4))
    assert_no_difference("ReadingSession.count") do
      delete v1_reading_session_url(@reading_session.snowflake)
    end
    assert_response :not_found
  end
end
