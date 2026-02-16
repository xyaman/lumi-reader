require "test_helper"

class PatreonServiceTest < ActiveSupport::TestCase
  test "valid_webhook_signature returns true for valid signature" do
    payload = '{"data":{"id":"123"}}'
    secret = ENV["PATREON_CLIENT_SECRET"] || "test_secret"
    signature = OpenSSL::HMAC.hexdigest("sha256", secret, payload)

    result = PatreonService.valid_webhook_signature?(payload, signature)
    assert result
  end

  test "valid_webhook_signature returns false for invalid signature" do
    result = PatreonService.valid_webhook_signature?('{"data":{}}', "invalid")
    assert_not result
  end

  test "valid_webhook_signature returns false for blank signature" do
    assert_not PatreonService.valid_webhook_signature?('{"data":{}}', nil)
    assert_not PatreonService.valid_webhook_signature?('{"data":{}}', "")
  end
end
