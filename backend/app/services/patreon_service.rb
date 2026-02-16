require "net/http"
require "json"
require "openssl"


# https://docs.patreon.com/#oauth
class PatreonService
  class PatreonApiError < StandardError; end
  PATREON_API_BASE = "https://www.patreon.com/api/oauth2/v2"

  # https://www.patreon.com/api/oauth2/v2/campaigns
  # with your own creator token
  CAMPAIGN_ID = ENV["PATREON_CAMPAIGN_ID"]
  CREATOR_ACCESS_TOKEN = ENV["PATREON_CREATOR_ACCESS_TOKEN"]
  CLIENT_ID = ENV["PATREON_CLIENT_ID"]
  CLIENT_SECRET = ENV["PATREON_CLIENT_SECRET"]
  PATREON_REDIRECT_URI = ENV["PATREON_REDIRECT_URI"]

  # --- Class Methods ---
  def self.authorization_url(session_id)
    uri = URI("https://www.patreon.com/oauth2/authorize")
    uri.query = URI.encode_www_form({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: PATREON_REDIRECT_URI,
      state: session_id
    })
    uri.to_s
  end

  def self.fetch_tiers
    uri = URI(
      "#{PATREON_API_BASE}/campaigns/#{CAMPAIGN_ID}" \
      "?include=tiers" \
      "&fields[tier]=title,amount_cents,description,published,patron_count,created_at,image_url"
    )
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{CREATOR_ACCESS_TOKEN}"
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    raise PatreonApiError, "Patreon API error: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)
    data = JSON.parse(res.body)
    data
  end

  def self.valid_webhook_signature?(payload, signature)
    return false if signature.blank?
    return false if CLIENT_SECRET.blank?

    expected = OpenSSL::HMAC.hexdigest("sha256", CLIENT_SECRET, payload)
    ActiveSupport::SecurityUtils.secure_compare(expected, signature)
  end

  def initialize(user)
    @user = user
  end

  def authenticate_and_store(code)
    tokens = get_tokens(code)
    update_user_tokens!(tokens)

    identity_data = fetch_identity_and_memberships(tokens["access_token"])
    update_patreon_tier!(identity_data)
  end

  def update_and_store
    ensure_token!

    identity_data = fetch_identity_and_memberships(@user.patreon_access_token)
    update_patreon_tier!(identity_data)
  end

  private

  def fetch_identity_and_memberships(access_token)
    uri = URI("#{PATREON_API_BASE}/identity?include=memberships.currently_entitled_tiers&fields%5Btier%5D=title")
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{access_token}"
    res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
    raise PatreonApiError, "Patreon API error: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)
    data = JSON.parse(res.body)
    data
  end

  # https://docs.patreon.com/#step-4-validating-receipt-of-the-oauth-token
  def get_tokens(code)
    update_token({
      grant_type: "authorization_code",
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: PATREON_REDIRECT_URI
    })
  end


  # https://docs.patreon.com/?shell#step-7-keeping-up-to-date
  def refresh_token(refresh_token)
    update_token({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  end

  def update_token(params)
    uri = URI("https://www.patreon.com/api/oauth2/token")
    res = Net::HTTP.post_form(uri, params)
    raise PatreonApiError, "Patreon API error: #{res.code} #{res.body}" unless res.is_a?(Net::HTTPSuccess)
    body = JSON.parse(res.body)
    body
  end

  def update_user_tokens!(tokens)
    expiry_date = Time.current + tokens["expires_in"].to_i.seconds
    @user.update!(
      patreon_access_token: tokens["access_token"],
      patreon_refresh_token: tokens["refresh_token"],
      patreon_expires_at: expiry_date
    )
  end

  def user_tokens
    {
      "access_token" => @user.patreon_access_token,
      "refresh_token" => @user.patreon_refresh_token
    }
  end

  def ensure_token!
    raise PatreonApiError, "Patreon API error: No refresh token found. Unlink and login with Patreon again." unless @user.patreon_refresh_token

    if @user.patreon_expires_at.nil? || @user.patreon_expires_at < 2.minutes.from_now
      tokens = refresh_token(@user.patreon_refresh_token, PATREON_REDIRECT_URI)
      update_user_tokens!(tokens)
    end
  end

  def update_patreon_tier!(identity_data)
    patreon_user_id = identity_data.dig("data", "id")

    membership = identity_data.dig("included")&.find { |i| i["type"] == "membership" }
    tier_id = membership&.dig("relationships", "currently_entitled_tiers", "data", 0, "id")

    if tier_id
      patreon_tier = PatreonTier.find_by(patreon_tier_id: tier_id)
    else
      patreon_tier = PatreonTier.find_by(name: "Free")
    end

    @user.update!(
      patreon_id: patreon_user_id,
      patreon_tier: patreon_tier
    )
  end
end
