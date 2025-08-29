require "test_helper"

class V1::PatreonTiersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @free_tier = patreon_tiers(:free)
    @supporter_tier = patreon_tiers(:supporter)
  end

  test "should get index" do
    get v1_patreon_tiers_url
    assert_response :success
  end

  test "should show patreon tier" do
    get v1_patreon_tier_url(id: @free_tier.patreon_tier_id)
    assert_response :success
    json = JSON.parse(@response.body)
    assert_equal @free_tier.name, json["data"]["name"]
  end

  test "should return error for missing patreon tier" do
    get v1_patreon_tier_url(id: "nonexistent")
    assert_response :unprocessable_content
    json = JSON.parse(@response.body)
    assert_equal ["Patreon tier not found."], json["errors"]
  end
end
